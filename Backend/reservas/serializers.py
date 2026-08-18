from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from rest_framework import serializers

from .models import (
    Categoria,
    HorarioRestaurante,
    Mesa,
    Reserva,
    Restaurante,
    Usuario,
)
from .services import MARCA_ACOMODACION_INTERNA


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ("id", "nombre", "slug", "activa")
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(
        max_length=128,
        trim_whitespace=False,
        write_only=True,
    )


class ClienteRegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True)
    email = serializers.EmailField(max_length=254)
    phone = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )
    password = serializers.CharField(
        min_length=8,
        max_length=128,
        trim_whitespace=False,
        write_only=True,
    )
    confirmPassword = serializers.CharField(
        min_length=8,
        max_length=128,
        trim_whitespace=False,
        write_only=True,
    )

    def validate(self, attrs):
        if attrs["password"] != attrs["confirmPassword"]:
            raise serializers.ValidationError({
                "confirmPassword": "Las contraseñas no coinciden.",
            })
        return attrs


class UsuarioProfileUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=120,
        required=False,
        trim_whitespace=True,
    )
    email = serializers.EmailField(max_length=254, required=False)
    phone = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Envíe al menos un dato del perfil para actualizar.",
            )
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(
        max_length=128,
        trim_whitespace=False,
        write_only=True,
    )
    newPassword = serializers.CharField(
        min_length=8,
        max_length=128,
        trim_whitespace=False,
        write_only=True,
    )
    confirmNewPassword = serializers.CharField(
        min_length=8,
        max_length=128,
        trim_whitespace=False,
        write_only=True,
    )

    def validate(self, attrs):
        if attrs["newPassword"] != attrs["confirmNewPassword"]:
            raise serializers.ValidationError({
                "confirmNewPassword": "Las contraseñas no coinciden.",
            })
        if attrs["currentPassword"] == attrs["newPassword"]:
            raise serializers.ValidationError({
                "newPassword": "La nueva contraseña debe ser diferente.",
            })
        return attrs


class UsuarioSesionSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="nombres", read_only=True)
    phone = serializers.CharField(source="telefono", read_only=True)
    role = serializers.CharField(source="rol", read_only=True)
    status = serializers.CharField(source="estado", read_only=True)
    restaurantId = serializers.SerializerMethodField()
    restaurantName = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = (
            "id",
            "name",
            "email",
            "phone",
            "role",
            "status",
            "restaurantId",
            "restaurantName",
        )
        read_only_fields = fields

    def _get_restaurant(self, usuario):
        if usuario.rol != Usuario.Rol.RESTAURANTE:
            return None

        try:
            return usuario.restaurante_administrado
        except Restaurante.DoesNotExist:
            return None

    def get_restaurantId(self, usuario):
        restaurante = self._get_restaurant(usuario)
        return restaurante.id if restaurante else None

    def get_restaurantName(self, usuario):
        restaurante = self._get_restaurant(usuario)
        return restaurante.nombre if restaurante else None


class RestauranteSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="nombre", read_only=True)
    description = serializers.CharField(source="descripcion", read_only=True)
    image = serializers.URLField(source="imagen_url", read_only=True)
    location = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    isReservable = serializers.SerializerMethodField()
    unavailableReason = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    categories = CategoriaSerializer(
        source="categorias",
        many=True,
        read_only=True,
    )

    class Meta:
        model = Restaurante
        fields = (
            "id",
            "name",
            "description",
            "image",
            "location",
            "latitude",
            "longitude",
            "isReservable",
            "unavailableReason",
            "rating",
            "categories",
        )
        read_only_fields = fields

    def get_location(self, restaurante):
        return f"{restaurante.ciudad}, {restaurante.departamento}"

    def get_latitude(self, restaurante):
        return None if restaurante.latitud is None else float(restaurante.latitud)

    def get_longitude(self, restaurante):
        return None if restaurante.longitud is None else float(restaurante.longitud)

    def get_isReservable(self, restaurante):
        mesas_activas = getattr(restaurante, "mesas_activas", None)
        if mesas_activas is not None:
            return bool(mesas_activas)
        return restaurante.mesas.filter(activa=True).exists()

    def get_unavailableReason(self, restaurante):
        if self.get_isReservable(restaurante):
            return None
        return "El restaurante aún no tiene mesas activas configuradas."

    def get_rating(self, restaurante):
        return float(restaurante.calificacion_promedio)


class HorarioRestauranteSerializer(serializers.ModelSerializer):
    day = serializers.IntegerField(source="dia_semana", read_only=True)
    dayName = serializers.CharField(
        source="get_dia_semana_display",
        read_only=True,
    )
    openingTime = serializers.TimeField(
        source="hora_apertura",
        format="%H:%M",
        read_only=True,
    )
    closingTime = serializers.TimeField(
        source="hora_cierre",
        format="%H:%M",
        read_only=True,
    )

    class Meta:
        model = HorarioRestaurante
        fields = ("day", "dayName", "openingTime", "closingTime")
        read_only_fields = fields


class HorarioAdminSerializer(HorarioRestauranteSerializer):
    id = serializers.IntegerField(read_only=True)
    active = serializers.BooleanField(source="activo", read_only=True)

    class Meta(HorarioRestauranteSerializer.Meta):
        fields = (
            "id",
            "day",
            "dayName",
            "openingTime",
            "closingTime",
            "active",
        )
        read_only_fields = fields


class HorarioReplaceSerializer(serializers.Serializer):
    openingTime = serializers.TimeField(input_formats=("%H:%M",))
    closingTime = serializers.TimeField(input_formats=("%H:%M",))
    active = serializers.BooleanField(default=True)

    def validate(self, attrs):
        if attrs["closingTime"] <= attrs["openingTime"]:
            raise serializers.ValidationError({
                "closingTime": (
                    "La hora de cierre debe ser posterior a la apertura."
                ),
            })
        return attrs


class HorarioUpdateSerializer(serializers.Serializer):
    openingTime = serializers.TimeField(
        input_formats=("%H:%M",),
        required=False,
    )
    closingTime = serializers.TimeField(
        input_formats=("%H:%M",),
        required=False,
    )
    active = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Envíe al menos un campo del horario para actualizar.",
            )

        if (
            "openingTime" in attrs
            and "closingTime" in attrs
            and attrs["closingTime"] <= attrs["openingTime"]
        ):
            raise serializers.ValidationError({
                "closingTime": (
                    "La hora de cierre debe ser posterior a la apertura."
                ),
            })

        return attrs


class MesaAdminSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="nombre", read_only=True)
    minCapacity = serializers.IntegerField(
        source="capacidad_min",
        read_only=True,
    )
    maxCapacity = serializers.IntegerField(
        source="capacidad_max",
        read_only=True,
    )
    active = serializers.BooleanField(source="activa", read_only=True)

    class Meta:
        model = Mesa
        fields = ("id", "name", "minCapacity", "maxCapacity", "active")
        read_only_fields = fields


class MesaCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50, trim_whitespace=True)
    minCapacity = serializers.IntegerField(min_value=1, default=1)
    maxCapacity = serializers.IntegerField(min_value=1)
    active = serializers.BooleanField(default=True)

    def validate(self, attrs):
        if attrs["maxCapacity"] < attrs["minCapacity"]:
            raise serializers.ValidationError({
                "maxCapacity": (
                    "La capacidad máxima debe ser igual o superior a la mínima."
                ),
            })
        return attrs


class MesaUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=50,
        required=False,
        trim_whitespace=True,
    )
    minCapacity = serializers.IntegerField(min_value=1, required=False)
    maxCapacity = serializers.IntegerField(min_value=1, required=False)
    active = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Envíe al menos un campo de la mesa para actualizar.",
            )

        if (
            "minCapacity" in attrs
            and "maxCapacity" in attrs
            and attrs["maxCapacity"] < attrs["minCapacity"]
        ):
            raise serializers.ValidationError({
                "maxCapacity": (
                    "La capacidad máxima debe ser igual o superior a la mínima."
                ),
            })

        return attrs


class RestauranteDetalleSerializer(RestauranteSerializer):
    tableCapacities = serializers.SerializerMethodField(
        method_name="get_table_capacities",
    )
    schedules = HorarioRestauranteSerializer(
        source="horarios",
        many=True,
        read_only=True,
    )

    class Meta(RestauranteSerializer.Meta):
        fields = RestauranteSerializer.Meta.fields + (
            "tableCapacities",
            "schedules",
        )
        read_only_fields = fields

    def get_table_capacities(self, restaurante):
        mesas = getattr(restaurante, "mesas_activas", None)

        if mesas is None:
            capacidades = restaurante.mesas.filter(activa=True).values_list(
                "capacidad_max",
                flat=True,
            )
        else:
            capacidades = (mesa.capacidad_max for mesa in mesas)

        return sorted(set(capacidades))


class RestauranteAdminProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="nombre", read_only=True)
    description = serializers.CharField(source="descripcion", read_only=True)
    address = serializers.CharField(source="direccion", read_only=True)
    city = serializers.CharField(source="ciudad", read_only=True)
    department = serializers.CharField(source="departamento", read_only=True)
    phone = serializers.CharField(source="telefono", read_only=True)
    email = serializers.EmailField(source="usuario_admin.email", read_only=True)
    categories = CategoriaSerializer(
        source="categorias",
        many=True,
        read_only=True,
    )

    class Meta:
        model = Restaurante
        fields = (
            "id",
            "name",
            "categories",
            "description",
            "address",
            "city",
            "department",
            "phone",
            "email",
        )
        read_only_fields = fields


class RestauranteAdminProfileUpdateSerializer(serializers.Serializer):
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        trim_whitespace=True,
    )
    phone = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
        allow_null=True,
        trim_whitespace=True,
    )

    def to_internal_value(self, data):
        protected_fields = set(data) - set(self.fields)
        if protected_fields:
            raise serializers.ValidationError({
                field: "Este dato solo puede modificarlo un superadministrador."
                for field in sorted(protected_fields)
            })
        return super().to_internal_value(data)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Envíe la descripción o el teléfono para actualizar.",
            )
        return attrs


class RestauranteAdminCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(
        min_length=8,
        max_length=128,
        trim_whitespace=False,
        write_only=True,
    )
    phone = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )


class RestauranteHorarioCreateSerializer(serializers.Serializer):
    day = serializers.IntegerField(min_value=1, max_value=7)
    openingTime = serializers.TimeField(input_formats=("%H:%M",))
    closingTime = serializers.TimeField(input_formats=("%H:%M",))
    active = serializers.BooleanField(default=True)

    def validate(self, attrs):
        if attrs["closingTime"] <= attrs["openingTime"]:
            raise serializers.ValidationError({
                "closingTime": (
                    "La hora de cierre debe ser posterior a la apertura."
                ),
            })
        return attrs


class RestauranteMesaCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50, trim_whitespace=True)
    minCapacity = serializers.IntegerField(min_value=1, default=1)
    maxCapacity = serializers.IntegerField(min_value=1)
    active = serializers.BooleanField(default=True)

    def validate(self, attrs):
        if attrs["maxCapacity"] < attrs["minCapacity"]:
            raise serializers.ValidationError({
                "maxCapacity": (
                    "La capacidad máxima debe ser igual o superior a la mínima."
                ),
            })
        return attrs


class RestauranteCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, trim_whitespace=True)
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )
    address = serializers.CharField(max_length=200, trim_whitespace=True)
    city = serializers.CharField(max_length=100, trim_whitespace=True)
    department = serializers.CharField(max_length=100, trim_whitespace=True)
    phone = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )
    image = serializers.URLField(
        max_length=500,
        required=False,
        allow_blank=True,
    )
    latitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=7,
        min_value=-90,
        max_value=90,
        required=False,
        allow_null=True,
    )
    longitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=7,
        min_value=-180,
        max_value=180,
        required=False,
        allow_null=True,
    )
    admin = RestauranteAdminCreateSerializer()
    categoryIds = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )
    schedules = RestauranteHorarioCreateSerializer(many=True, allow_empty=False)
    tables = RestauranteMesaCreateSerializer(many=True, allow_empty=False)

    def validate_categoryIds(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "No repita categorías para el mismo restaurante.",
            )
        return value

    def validate_schedules(self, value):
        dias = [horario["day"] for horario in value]
        if len(dias) != len(set(dias)):
            raise serializers.ValidationError(
                "No repita días en los horarios del restaurante.",
            )
        return value

    def validate_tables(self, value):
        nombres = [mesa["name"].casefold() for mesa in value]
        if len(nombres) != len(set(nombres)):
            raise serializers.ValidationError(
                "No repita nombres de mesa para el mismo restaurante.",
            )
        return value


class RestauranteUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=150,
        required=False,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        trim_whitespace=True,
    )
    address = serializers.CharField(
        max_length=200,
        required=False,
        trim_whitespace=True,
    )
    city = serializers.CharField(
        max_length=100,
        required=False,
        trim_whitespace=True,
    )
    department = serializers.CharField(
        max_length=100,
        required=False,
        trim_whitespace=True,
    )
    phone = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
        allow_null=True,
        trim_whitespace=True,
    )
    image = serializers.URLField(
        max_length=500,
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    categoryIds = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=False,
    )
    status = serializers.ChoiceField(
        choices=Restaurante.Estado.choices,
        required=False,
    )

    def validate_categoryIds(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "No repita categorías para el mismo restaurante.",
            )
        return value

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Envíe al menos un campo del restaurante para actualizar.",
            )
        return attrs


class DisponibilidadQuerySerializer(serializers.Serializer):
    fecha = serializers.DateField()
    personas = serializers.IntegerField(
        min_value=1,
        error_messages={
            "min_value": "El número de personas no puede ser 0.",
        },
    )
    capacidad = serializers.IntegerField(min_value=1, required=False)

    def validate_fecha(self, value):
        hoy = datetime.now(ZoneInfo("America/Bogota")).date()

        if value < hoy:
            raise serializers.ValidationError(
                "La fecha no puede estar en el pasado.",
            )

        return value

    def validate(self, attrs):
        capacidad = attrs.get("capacidad")

        if capacidad is not None and capacidad < attrs["personas"]:
            raise serializers.ValidationError({
                "capacidad": (
                    "La capacidad solicitada debe cubrir el número de personas."
                ),
            })

        return attrs


class ReservaCreateSerializer(serializers.Serializer):
    restaurantId = serializers.IntegerField(min_value=1)
    date = serializers.DateField()
    time = serializers.TimeField(input_formats=("%H:%M",))
    people = serializers.IntegerField(
        min_value=1,
        error_messages={
            "min_value": "El número de personas no puede ser 0.",
        },
    )
    tableCapacity = serializers.IntegerField(
        min_value=1,
        required=False,
        allow_null=True,
    )
    notes = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )


class ReservaListQuerySerializer(serializers.Serializer):
    restaurantId = serializers.IntegerField(min_value=1, required=False)
    date = serializers.DateField(required=False)


class EstadisticasRestauranteQuerySerializer(serializers.Serializer):
    startDate = serializers.DateField(required=False)
    endDate = serializers.DateField(required=False)

    def validate(self, attrs):
        start_date = attrs.get("startDate")
        end_date = attrs.get("endDate")

        if (start_date is None) != (end_date is None):
            raise serializers.ValidationError(
                "Seleccione tanto la fecha inicial como la fecha final.",
            )

        today = datetime.now(ZoneInfo("America/Bogota")).date()
        if start_date is None:
            start_date = today - timedelta(days=today.weekday())
            end_date = today

        if start_date > end_date:
            raise serializers.ValidationError({
                "endDate": "La fecha final debe ser igual o posterior a la inicial.",
            })
        if (end_date - start_date).days > 30:
            raise serializers.ValidationError({
                "endDate": "El periodo máximo permitido es de 31 días.",
            })

        attrs["startDate"] = start_date
        attrs["endDate"] = end_date
        return attrs


class ReservaListSerializer(serializers.ModelSerializer):
    restaurantId = serializers.IntegerField(
        source="restaurante_id",
        read_only=True,
    )
    restaurantName = serializers.CharField(
        source="restaurante.nombre",
        read_only=True,
    )
    userId = serializers.IntegerField(source="usuario_id", read_only=True)
    userName = serializers.CharField(source="usuario.nombres", read_only=True)
    date = serializers.DateField(source="fecha", format="%Y-%m-%d", read_only=True)
    startTime = serializers.TimeField(
        source="hora_inicio",
        format="%H:%M",
        read_only=True,
    )
    endTime = serializers.TimeField(
        source="hora_fin",
        format="%H:%M",
        read_only=True,
    )
    people = serializers.IntegerField(source="personas", read_only=True)
    requestedCapacity = serializers.SerializerMethodField()
    status = serializers.CharField(source="estado", read_only=True)
    notes = serializers.CharField(source="notas", read_only=True)
    cancelledAt = serializers.DateTimeField(
        source="cancelada_en",
        read_only=True,
        allow_null=True,
    )
    requiresArrangement = serializers.SerializerMethodField()
    tables = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = (
            "id",
            "restaurantId",
            "restaurantName",
            "userId",
            "userName",
            "date",
            "startTime",
            "endTime",
            "people",
            "requestedCapacity",
            "status",
            "notes",
            "cancelledAt",
            "requiresArrangement",
            "tables",
        )
        read_only_fields = fields

    def get_requestedCapacity(self, reserva):
        if self.get_requiresArrangement(reserva):
            return None
        return reserva.capacidad_mesa_solicitada

    def get_requiresArrangement(self, reserva):
        return bool(
            reserva.notas
            and reserva.notas.startswith(MARCA_ACOMODACION_INTERNA)
        )

    def get_tables(self, reserva):
        asignaciones = getattr(reserva, "asignaciones_precargadas", None)

        if asignaciones is None:
            asignaciones = reserva.asignaciones_mesa.select_related("mesa").all()

        return [
            {
                "id": asignacion.mesa_id,
                "name": asignacion.mesa.nombre,
                "capacity": asignacion.mesa.capacidad_max,
                "releasedAt": asignacion.liberada_en,
            }
            for asignacion in asignaciones
        ]
