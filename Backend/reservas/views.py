from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import (
    AuthenticationFailed,
    PermissionDenied,
    ValidationError,
)
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED
from rest_framework.views import APIView

from .models import (
    Categoria,
    HorarioRestaurante,
    Mesa,
    Reserva,
    ReservaMesa,
    Restaurante,
    Usuario,
)
from .authentication import crear_token_acceso
from .permissions import IsRestaurante, IsSuperadmin
from .serializers import (
    CategoriaSerializer,
    ClienteRegisterSerializer,
    DisponibilidadQuerySerializer,
    EstadisticasRestauranteQuerySerializer,
    HorarioAdminSerializer,
    HorarioReplaceSerializer,
    HorarioUpdateSerializer,
    MesaAdminSerializer,
    MesaCreateSerializer,
    MesaUpdateSerializer,
    LoginSerializer,
    PasswordChangeSerializer,
    ReservaCreateSerializer,
    ReservaListQuerySerializer,
    ReservaListSerializer,
    RestauranteCreateSerializer,
    RestauranteAdminProfileSerializer,
    RestauranteAdminProfileUpdateSerializer,
    RestauranteDetalleSerializer,
    RestauranteSerializer,
    RestauranteUpdateSerializer,
    UsuarioProfileUpdateSerializer,
    UsuarioSesionSerializer,
)
from .services import (
    actualizar_perfil_restaurante,
    actualizar_restaurante,
    actualizar_mesa_restaurante,
    cancelar_reserva,
    configurar_horario_restaurante,
    crear_reserva,
    crear_restaurante,
    crear_mesa_restaurante,
    es_inicio_reserva_futuro,
    marcar_reserva_no_show,
    obtener_regla_capacidades,
    obtener_estadisticas_restaurante,
)


def _session_payload(usuario):
    return {
        "accessToken": crear_token_acceso(usuario),
        "tokenType": "Bearer",
        "expiresIn": settings.INNOVAREST_ACCESS_TOKEN_MAX_AGE,
        "user": UsuarioSesionSerializer(usuario).data,
    }


class LoginView(APIView):
    permission_classes = (AllowAny,)
    http_method_names = ("post", "options")

    def post(self, request):
        payload = LoginSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        usuario = Usuario.objects.filter(
            email__iexact=payload.validated_data["email"],
            estado=Usuario.Estado.ACTIVO,
        ).first()

        if usuario is None or not usuario.check_password(
            payload.validated_data["password"],
        ):
            raise AuthenticationFailed("Correo o contraseña incorrectos.")

        return Response(_session_payload(usuario))


class RegisterView(APIView):
    permission_classes = (AllowAny,)
    http_method_names = ("post", "options")

    def post(self, request):
        payload = ClienteRegisterSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        email = Usuario.objects.normalize_email(data["email"])

        try:
            with transaction.atomic():
                if Usuario.objects.filter(email__iexact=email).exists():
                    raise ValidationError({
                        "email": "Ya existe una cuenta con este correo.",
                    })

                usuario = Usuario(
                    nombres=data["name"],
                    email=email,
                    telefono=data.get("phone") or None,
                    rol=Usuario.Rol.CLIENTE,
                    estado=Usuario.Estado.ACTIVO,
                )
                usuario.set_password(data["password"])
                usuario.save(force_insert=True)
        except IntegrityError as error:
            raise ValidationError({
                "email": "Ya existe una cuenta con este correo.",
            }) from error

        return Response(_session_payload(usuario), status=HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = (IsAuthenticated,)
    http_method_names = ("get", "patch", "head", "options")

    def get(self, request):
        return Response(UsuarioSesionSerializer(request.user).data)

    def patch(self, request):
        if request.user.rol != Usuario.Rol.CLIENTE:
            raise PermissionDenied("Solo los clientes pueden editar este perfil.")

        payload = UsuarioProfileUpdateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        with transaction.atomic():
            usuario = Usuario.objects.select_for_update().get(pk=request.user.pk)
            if "email" in data:
                email = Usuario.objects.normalize_email(data["email"])
                if Usuario.objects.filter(
                    email__iexact=email,
                ).exclude(pk=usuario.pk).exists():
                    raise ValidationError({
                        "email": "Ya existe una cuenta con este correo.",
                    })
                usuario.email = email
            if "name" in data:
                usuario.nombres = data["name"]
            if "phone" in data:
                usuario.telefono = data["phone"] or None
            try:
                usuario.save()
            except IntegrityError as error:
                raise ValidationError({
                    "email": "Ya existe una cuenta con este correo.",
                }) from error

        return Response(UsuarioSesionSerializer(usuario).data)


class PasswordChangeView(APIView):
    permission_classes = (IsAuthenticated,)
    http_method_names = ("patch", "options")

    def patch(self, request):
        if request.user.rol != Usuario.Rol.CLIENTE:
            raise PermissionDenied(
                "Solo los clientes pueden cambiar la contraseña desde aquí.",
            )

        payload = PasswordChangeSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        with transaction.atomic():
            usuario = Usuario.objects.select_for_update().get(pk=request.user.pk)
            if not usuario.check_password(data["currentPassword"]):
                raise ValidationError({
                    "currentPassword": "La contraseña actual es incorrecta.",
                })
            usuario.set_password(data["newPassword"])
            usuario.save()

        return Response(_session_payload(usuario))


class CategoriaListView(ListAPIView):
    serializer_class = CategoriaSerializer
    permission_classes = (AllowAny,)
    http_method_names = ("get", "head", "options")

    def get_queryset(self):
        return Categoria.objects.filter(activa=True).order_by("nombre")


class RestauranteListView(ListAPIView):
    serializer_class = RestauranteSerializer
    permission_classes = (AllowAny,)
    http_method_names = ("get", "post", "head", "options")

    def get_permissions(self):
        if self.request.method == "POST":
            return (IsAuthenticated(), IsSuperadmin())
        return (AllowAny(),)

    def get_queryset(self):
        queryset = Restaurante.objects.filter(
            estado=Restaurante.Estado.ACTIVO,
        ).prefetch_related(
            Prefetch(
                "categorias",
                queryset=Categoria.objects.filter(activa=True).order_by("nombre"),
            ),
            Prefetch(
                "mesas",
                queryset=Mesa.objects.filter(activa=True).order_by(
                    "capacidad_max",
                    "id",
                ),
                to_attr="mesas_activas",
            ),
        )

        categoria = self.request.query_params.get("categoria", "").strip()
        buscar = self.request.query_params.get("buscar", "").strip()

        if categoria:
            queryset = queryset.filter(
                categorias__activa=True,
                categorias__slug__iexact=categoria,
            )

        if buscar:
            queryset = queryset.filter(
                Q(nombre__icontains=buscar)
                | Q(direccion__icontains=buscar)
                | Q(ciudad__icontains=buscar)
                | Q(departamento__icontains=buscar)
                | Q(categorias__nombre__icontains=buscar)
                | Q(categorias__slug__icontains=buscar),
            )

        return queryset.distinct().order_by("nombre")

    def post(self, request):
        payload = RestauranteCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        datos_restaurante = {
            field: data.get(field)
            for field in (
                "name",
                "description",
                "address",
                "city",
                "department",
                "phone",
                "image",
                "latitude",
                "longitude",
            )
        }

        try:
            resultado = crear_restaurante(
                superadmin=request.user,
                datos_restaurante=datos_restaurante,
                datos_administrador=data["admin"],
                categoria_ids=data["categoryIds"],
                horarios=data["schedules"],
                mesas=data["tables"],
            )
        except DjangoValidationError as error:
            if hasattr(error, "message_dict"):
                raise ValidationError(error.message_dict) from error
            raise ValidationError({"nonFieldErrors": error.messages}) from error

        restaurante = Restaurante.objects.prefetch_related(
            Prefetch(
                "categorias",
                queryset=Categoria.objects.filter(activa=True).order_by("nombre"),
            ),
            Prefetch(
                "horarios",
                queryset=HorarioRestaurante.objects.filter(activo=True).order_by(
                    "dia_semana",
                ),
            ),
            Prefetch(
                "mesas",
                queryset=Mesa.objects.filter(activa=True).order_by(
                    "capacidad_max",
                    "id",
                ),
                to_attr="mesas_activas",
            ),
        ).get(pk=resultado.restaurante.pk)
        response_data = dict(RestauranteDetalleSerializer(restaurante).data)
        response_data["admin"] = {
            "id": resultado.administrador.id,
            "name": resultado.administrador.nombres,
            "email": resultado.administrador.email,
            "role": resultado.administrador.rol,
        }
        return Response(response_data, status=HTTP_201_CREATED)


class RestauranteDetailView(RetrieveAPIView):
    serializer_class = RestauranteDetalleSerializer
    permission_classes = (AllowAny,)
    http_method_names = ("get", "patch", "head", "options")

    def get_permissions(self):
        if self.request.method == "PATCH":
            return (IsAuthenticated(), IsSuperadmin())
        return (AllowAny(),)

    def get_queryset(self):
        return Restaurante.objects.filter(
            estado=Restaurante.Estado.ACTIVO,
        ).prefetch_related(
            Prefetch(
                "categorias",
                queryset=Categoria.objects.filter(activa=True).order_by("nombre"),
            ),
            Prefetch(
                "horarios",
                queryset=HorarioRestaurante.objects.filter(activo=True).order_by(
                    "dia_semana",
                ),
            ),
            Prefetch(
                "mesas",
                queryset=Mesa.objects.filter(activa=True).order_by(
                    "capacidad_max",
                    "id",
                ),
                to_attr="mesas_activas",
            ),
        )

    def patch(self, request, pk):
        payload = RestauranteUpdateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = dict(payload.validated_data)
        restaurante = get_object_or_404(Restaurante, pk=pk)

        try:
            resultado = actualizar_restaurante(
                superadmin=request.user,
                restaurante=restaurante,
                cambios=data,
            )
        except DjangoValidationError as error:
            if hasattr(error, "message_dict"):
                raise ValidationError(error.message_dict) from error
            raise ValidationError({"nonFieldErrors": error.messages}) from error

        restaurante = Restaurante.objects.prefetch_related(
            Prefetch(
                "categorias",
                queryset=Categoria.objects.filter(activa=True).order_by("nombre"),
            ),
            Prefetch(
                "horarios",
                queryset=HorarioRestaurante.objects.filter(activo=True).order_by(
                    "dia_semana",
                ),
            ),
            Prefetch(
                "mesas",
                queryset=Mesa.objects.filter(activa=True).order_by(
                    "capacidad_max",
                    "id",
                ),
                to_attr="mesas_activas",
            ),
        ).get(pk=resultado.pk)
        response_data = dict(RestauranteDetalleSerializer(restaurante).data)
        response_data["status"] = restaurante.estado
        return Response(response_data)


class RestauranteAvailabilityView(APIView):
    permission_classes = (AllowAny,)
    http_method_names = ("get", "head", "options")

    def get(self, request, pk):
        restaurante = get_object_or_404(
            Restaurante,
            pk=pk,
            estado=Restaurante.Estado.ACTIVO,
        )
        query = DisponibilidadQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)

        fecha = query.validated_data["fecha"]
        personas = query.validated_data["personas"]
        capacidad = query.validated_data.get("capacidad")
        capacidades_activas = sorted(set(
            Mesa.objects.filter(
                restaurante=restaurante,
                activa=True,
            ).values_list("capacidad_max", flat=True),
        ))
        horario = HorarioRestaurante.objects.filter(
            restaurante=restaurante,
            dia_semana=fecha.isoweekday(),
            activo=True,
        ).first()

        response_data = {
            "restaurantId": restaurante.id,
            "date": fecha.isoformat(),
            "people": personas,
            "capacity": capacidad,
            "allowedCapacities": [],
            "requiresArrangement": False,
            "isReservable": bool(capacidades_activas),
            "unavailableReason": None,
            "hasSchedule": horario is not None,
            "hasCapacity": False,
            "slots": [],
        }

        if not capacidades_activas:
            response_data["unavailableReason"] = (
                "El restaurante no acepta reservas hasta configurar "
                "al menos una mesa activa."
            )
            return Response(response_data)

        capacidades_permitidas, requiere_acomodacion = obtener_regla_capacidades(
            capacidades_activas,
            personas,
        )

        if requiere_acomodacion and capacidad is not None:
            raise ValidationError({
                "capacidad": (
                    "No seleccione una mesa para grupos que requieren acomodación interna."
                ),
            })

        if not requiere_acomodacion and capacidad is None:
            raise ValidationError({
                "capacidad": "Seleccione una capacidad de mesa.",
            })

        if (
            not requiere_acomodacion
            and capacidad not in capacidades_permitidas
        ):
            raise ValidationError({
                "capacidad": (
                    "Seleccione una de las dos capacidades suficientes más cercanas."
                ),
            })

        response_data["allowedCapacities"] = capacidades_permitidas
        response_data["requiresArrangement"] = requiere_acomodacion

        if horario is None:
            return Response(response_data)

        mesas = [] if requiere_acomodacion else list(
            Mesa.objects.filter(
                restaurante=restaurante,
                activa=True,
                capacidad_min__lte=personas,
                capacidad_max=capacidad,
            ).order_by("capacidad_max", "id"),
        )
        response_data["hasCapacity"] = bool(mesas) or requiere_acomodacion

        asignaciones = ReservaMesa.objects.filter(
            mesa_id__in=[mesa.id for mesa in mesas],
            liberada_en__isnull=True,
            reserva__restaurante=restaurante,
            reserva__fecha=fecha,
            reserva__estado=Reserva.Estado.CONFIRMADA,
        ).values_list(
            "mesa_id",
            "reserva__hora_inicio",
            "reserva__hora_fin",
        )
        ocupacion_por_mesa = {mesa.id: [] for mesa in mesas}

        for mesa_id, hora_inicio, hora_fin in asignaciones:
            ocupacion_por_mesa[mesa_id].append((hora_inicio, hora_fin))

        apertura = datetime.combine(fecha, horario.hora_apertura)
        cierre = datetime.combine(fecha, horario.hora_cierre)
        ultima_reserva = cierre - timedelta(hours=1)
        hora_candidata = apertura
        slots = []

        while hora_candidata <= ultima_reserva:
            fin_candidato = min(hora_candidata + timedelta(hours=2), cierre)
            disponible = es_inicio_reserva_futuro(
                fecha,
                hora_candidata.time(),
            ) and (any(
                all(
                    not (
                        datetime.combine(fecha, inicio_existente) < fin_candidato
                        and datetime.combine(fecha, fin_existente) > hora_candidata
                    )
                    for inicio_existente, fin_existente in ocupacion_por_mesa[mesa.id]
                )
                for mesa in mesas
            ) or requiere_acomodacion)
            slots.append({
                "time": hora_candidata.strftime("%H:%M"),
                "available": disponible,
            })
            hora_candidata += timedelta(minutes=15)

        response_data["slots"] = slots
        return Response(response_data)


class RestauranteAdminProfileView(APIView):
    permission_classes = (IsAuthenticated, IsRestaurante)
    http_method_names = ("get", "patch", "head", "options")

    def _obtener_restaurante(self, pk):
        restaurante = get_object_or_404(
            Restaurante.objects.select_related("usuario_admin").prefetch_related(
                "categorias",
            ),
            pk=pk,
            estado=Restaurante.Estado.ACTIVO,
        )
        if restaurante.usuario_admin_id != self.request.user.id:
            raise PermissionDenied(
                "El usuario no administra este restaurante.",
            )
        return restaurante

    def get(self, request, pk):
        restaurante = self._obtener_restaurante(pk)
        return Response(RestauranteAdminProfileSerializer(restaurante).data)

    def patch(self, request, pk):
        restaurante = self._obtener_restaurante(pk)
        payload = RestauranteAdminProfileUpdateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        try:
            resultado = actualizar_perfil_restaurante(
                administrador=request.user,
                restaurante=restaurante,
                cambios=dict(payload.validated_data),
            )
        except DjangoValidationError as error:
            if hasattr(error, "message_dict"):
                raise ValidationError(error.message_dict) from error
            raise ValidationError({"nonFieldErrors": error.messages}) from error

        resultado = Restaurante.objects.select_related(
            "usuario_admin",
        ).prefetch_related("categorias").get(pk=resultado.pk)
        return Response(RestauranteAdminProfileSerializer(resultado).data)


class RestauranteAdminStatisticsView(APIView):
    permission_classes = (IsAuthenticated, IsRestaurante)
    http_method_names = ("get", "head", "options")

    def get(self, request, pk):
        query = EstadisticasRestauranteQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        restaurante = get_object_or_404(
            Restaurante,
            pk=pk,
            estado=Restaurante.Estado.ACTIVO,
        )
        if restaurante.usuario_admin_id != request.user.id:
            raise PermissionDenied(
                "El usuario no administra este restaurante.",
            )

        data = obtener_estadisticas_restaurante(
            restaurante=restaurante,
            fecha_inicial=query.validated_data["startDate"],
            fecha_final=query.validated_data["endDate"],
        )

        now_local = timezone.localtime(timezone.now(), ZoneInfo("America/Bogota"))
        upcoming = Reserva.objects.filter(
            Q(fecha__gt=now_local.date())
            | Q(fecha=now_local.date(), hora_inicio__gte=now_local.time()),
            restaurante=restaurante,
            estado=Reserva.Estado.CONFIRMADA,
        ).select_related(
            "restaurante",
            "usuario",
        ).prefetch_related(
            Prefetch(
                "asignaciones_mesa",
                queryset=ReservaMesa.objects.select_related("mesa").order_by(
                    "mesa_id",
                ),
                to_attr="asignaciones_precargadas",
            ),
        ).order_by("fecha", "hora_inicio", "id")[:5]
        data["upcomingReservations"] = ReservaListSerializer(
            upcoming,
            many=True,
        ).data
        return Response(data)


class HorarioRestauranteAdminListView(ListAPIView):
    serializer_class = HorarioAdminSerializer
    permission_classes = (IsAuthenticated, IsRestaurante)
    http_method_names = ("get", "head", "options")

    def get_queryset(self):
        restaurante = get_object_or_404(
            Restaurante,
            pk=self.kwargs["pk"],
            estado=Restaurante.Estado.ACTIVO,
        )

        if restaurante.usuario_admin_id != self.request.user.id:
            raise PermissionDenied(
                "El usuario no administra este restaurante.",
            )

        return HorarioRestaurante.objects.filter(
            restaurante=restaurante,
        ).order_by("dia_semana")


class HorarioRestauranteAdminDetailView(APIView):
    permission_classes = (IsAuthenticated, IsRestaurante)
    http_method_names = ("put", "patch", "options")
    error_field_map = {
        "dia_semana": "day",
        "hora_apertura": "openingTime",
        "hora_cierre": "closingTime",
        "activo": "active",
        "restaurante": "restaurantId",
    }

    def put(self, request, pk, day):
        payload = HorarioReplaceSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        return self._configurar(
            pk=pk,
            day=day,
            data=dict(payload.validated_data),
            crear_si_no_existe=True,
        )

    def patch(self, request, pk, day):
        payload = HorarioUpdateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        return self._configurar(
            pk=pk,
            day=day,
            data=dict(payload.validated_data),
            crear_si_no_existe=False,
        )

    def _configurar(self, *, pk, day, data, crear_si_no_existe):
        restaurante = get_object_or_404(Restaurante, pk=pk)

        try:
            resultado = configurar_horario_restaurante(
                administrador=self.request.user,
                restaurante=restaurante,
                dia_semana=day,
                cambios=data,
                crear_si_no_existe=crear_si_no_existe,
            )
        except DjangoValidationError as error:
            if hasattr(error, "message_dict"):
                raise ValidationError({
                    self.error_field_map.get(field, field): messages
                    for field, messages in error.message_dict.items()
                }) from error
            raise ValidationError({"nonFieldErrors": error.messages}) from error

        status_code = HTTP_201_CREATED if resultado.creado else 200
        return Response(
            HorarioAdminSerializer(resultado.horario).data,
            status=status_code,
        )


class MesaRestauranteAdminListView(ListAPIView):
    serializer_class = MesaAdminSerializer
    permission_classes = (IsAuthenticated, IsRestaurante)
    http_method_names = ("get", "post", "head", "options")

    def get_queryset(self):
        restaurante = self._obtener_restaurante()

        if restaurante.usuario_admin_id != self.request.user.id:
            raise PermissionDenied(
                "El usuario no administra este restaurante.",
            )

        return Mesa.objects.filter(restaurante=restaurante).order_by(
            "capacidad_max",
            "id",
        )

    def post(self, request, pk):
        payload = MesaCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = dict(payload.validated_data)
        restaurante = self._obtener_restaurante()

        try:
            resultado = crear_mesa_restaurante(
                administrador=request.user,
                restaurante=restaurante,
                datos=data,
            )
        except DjangoValidationError as error:
            raise ValidationError(self._normalizar_error(error)) from error

        return Response(
            MesaAdminSerializer(resultado.mesa).data,
            status=HTTP_201_CREATED,
        )

    def _obtener_restaurante(self):
        return get_object_or_404(
            Restaurante,
            pk=self.kwargs["pk"],
            estado=Restaurante.Estado.ACTIVO,
        )

    def _normalizar_error(self, error):
        if hasattr(error, "message_dict"):
            return {
                {
                    "nombre": "name",
                    "capacidad_min": "minCapacity",
                    "capacidad_max": "maxCapacity",
                    "activa": "active",
                    "restaurante": "restaurantId",
                }.get(field, field): messages
                for field, messages in error.message_dict.items()
            }
        return {"nonFieldErrors": error.messages}


class MesaRestauranteAdminDetailView(APIView):
    permission_classes = (IsAuthenticated, IsRestaurante)
    http_method_names = ("patch", "options")

    def patch(self, request, pk, table_id):
        payload = MesaUpdateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = dict(payload.validated_data)
        restaurante = get_object_or_404(
            Restaurante,
            pk=pk,
            estado=Restaurante.Estado.ACTIVO,
        )
        mesa = get_object_or_404(Mesa, pk=table_id)

        try:
            mesa = actualizar_mesa_restaurante(
                administrador=request.user,
                restaurante=restaurante,
                mesa=mesa,
                cambios=data,
            )
        except DjangoValidationError as error:
            raise ValidationError(self._normalizar_error(error)) from error

        return Response(MesaAdminSerializer(mesa).data)

    def _normalizar_error(self, error):
        if hasattr(error, "message_dict"):
            return {
                {
                    "nombre": "name",
                    "capacidad_min": "minCapacity",
                    "capacidad_max": "maxCapacity",
                    "activa": "active",
                    "restaurante": "restaurantId",
                }.get(field, field): messages
                for field, messages in error.message_dict.items()
            }
        return {"nonFieldErrors": error.messages}


class ReservaCollectionView(ListAPIView):
    serializer_class = ReservaListSerializer
    permission_classes = (IsAuthenticated,)
    http_method_names = ("get", "post", "head", "options")

    error_field_map = {
        "restaurante": "restaurantId",
        "usuario": "userId",
        "fecha": "date",
        "hora_inicio": "time",
        "personas": "people",
        "capacidad_mesa": "tableCapacity",
        "notas": "notes",
    }

    def get_queryset(self):
        query = ReservaListQuerySerializer(data=self.request.query_params)
        query.is_valid(raise_exception=True)
        data = query.validated_data

        queryset = Reserva.objects.select_related(
            "restaurante",
            "usuario",
        ).prefetch_related(
            Prefetch(
                "asignaciones_mesa",
                queryset=ReservaMesa.objects.select_related("mesa").order_by(
                    "mesa_id",
                ),
                to_attr="asignaciones_precargadas",
            ),
        )

        if self.request.user.rol == Usuario.Rol.CLIENTE:
            queryset = queryset.filter(usuario=self.request.user)
            if "restaurantId" in data:
                queryset = queryset.filter(restaurante_id=data["restaurantId"])
        elif self.request.user.rol == Usuario.Rol.RESTAURANTE:
            restaurante = Restaurante.objects.filter(
                usuario_admin=self.request.user,
            ).first()
            if restaurante is None:
                raise PermissionDenied(
                    "El usuario no administra ningún restaurante.",
                )
            if (
                "restaurantId" in data
                and data["restaurantId"] != restaurante.id
            ):
                raise PermissionDenied(
                    "El usuario no administra el restaurante solicitado.",
                )
            queryset = queryset.filter(restaurante=restaurante)
        elif self.request.user.rol == Usuario.Rol.SUPERADMIN:
            if "restaurantId" in data:
                queryset = queryset.filter(restaurante_id=data["restaurantId"])
        else:
            raise PermissionDenied("El rol del usuario no puede consultar reservas.")

        if "date" in data:
            queryset = queryset.filter(fecha=data["date"])

        return queryset.order_by("-fecha", "-hora_inicio", "-id")

    def post(self, request):
        if request.user.rol != Usuario.Rol.CLIENTE:
            raise PermissionDenied("Solo los clientes pueden crear reservas.")

        payload = ReservaCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        restaurante = get_object_or_404(
            Restaurante,
            pk=data["restaurantId"],
            estado=Restaurante.Estado.ACTIVO,
        )
        try:
            resultado = crear_reserva(
                restaurante=restaurante,
                usuario=request.user,
                fecha=data["date"],
                hora_inicio=data["time"],
                personas=data["people"],
                capacidad_mesa=data.get("tableCapacity"),
                notas=data.get("notes"),
            )
        except DjangoValidationError as error:
            raise ValidationError(self._normalizar_error(error)) from error

        reserva = resultado.reserva
        mesa = resultado.mesa
        response_data = {
            "id": reserva.id,
            "restaurantId": reserva.restaurante_id,
            "userId": reserva.usuario_id,
            "date": reserva.fecha.isoformat(),
            "startTime": reserva.hora_inicio.strftime("%H:%M"),
            "endTime": reserva.hora_fin.strftime("%H:%M"),
            "people": reserva.personas,
            "requestedCapacity": (
                None
                if resultado.requiere_acomodacion
                else reserva.capacidad_mesa_solicitada
            ),
            "status": reserva.estado,
            "requiresArrangement": resultado.requiere_acomodacion,
            "table": (
                {
                    "id": mesa.id,
                    "name": mesa.nombre,
                    "capacity": mesa.capacidad_max,
                }
                if mesa is not None
                else None
            ),
        }
        return Response(response_data, status=HTTP_201_CREATED)

    def _normalizar_error(self, error):
        if hasattr(error, "message_dict"):
            return {
                self.error_field_map.get(field, field): messages
                for field, messages in error.message_dict.items()
            }

        return {"nonFieldErrors": error.messages}


class ReservaCancelView(APIView):
    permission_classes = (IsAuthenticated,)
    http_method_names = ("patch", "options")

    error_field_map = {
        "reserva": "reservationId",
        "estado": "status",
    }

    def patch(self, request, pk):
        reserva = get_object_or_404(
            Reserva.objects.select_related("restaurante", "usuario"),
            pk=pk,
        )

        if request.user.rol == Usuario.Rol.CLIENTE:
            if reserva.usuario_id != request.user.id:
                raise PermissionDenied(
                    "La reserva no pertenece al cliente autenticado.",
                )
        elif request.user.rol == Usuario.Rol.RESTAURANTE:
            if reserva.restaurante.usuario_admin_id != request.user.id:
                raise PermissionDenied(
                    "El usuario no administra el restaurante de esta reserva.",
                )
        else:
            raise PermissionDenied(
                "Este rol no puede cancelar reservas.",
            )

        try:
            reserva = cancelar_reserva(reserva=reserva)
        except DjangoValidationError as error:
            raise ValidationError(self._normalizar_error(error)) from error

        reserva = Reserva.objects.select_related(
            "restaurante",
            "usuario",
        ).prefetch_related(
            Prefetch(
                "asignaciones_mesa",
                queryset=ReservaMesa.objects.select_related("mesa").order_by(
                    "mesa_id",
                ),
                to_attr="asignaciones_precargadas",
            ),
        ).get(pk=reserva.pk)
        return Response(ReservaListSerializer(reserva).data)

    def _normalizar_error(self, error):
        if hasattr(error, "message_dict"):
            return {
                self.error_field_map.get(field, field): messages
                for field, messages in error.message_dict.items()
            }

        return {"nonFieldErrors": error.messages}


class ReservaNoShowView(APIView):
    permission_classes = (IsAuthenticated, IsRestaurante)
    http_method_names = ("patch", "options")

    def patch(self, request, pk):
        reserva = get_object_or_404(
            Reserva.objects.select_related("restaurante", "usuario"),
            pk=pk,
        )

        try:
            reserva = marcar_reserva_no_show(
                reserva=reserva,
                administrador=request.user,
            )
        except DjangoValidationError as error:
            if hasattr(error, "message_dict"):
                raise ValidationError(error.message_dict) from error
            raise ValidationError({"nonFieldErrors": error.messages}) from error

        reserva = Reserva.objects.select_related(
            "restaurante",
            "usuario",
        ).prefetch_related(
            Prefetch(
                "asignaciones_mesa",
                queryset=ReservaMesa.objects.select_related("mesa").order_by(
                    "mesa_id",
                ),
                to_attr="asignaciones_precargadas",
            ),
        ).get(pk=reserva.pk)
        return Response(ReservaListSerializer(reserva).data)
