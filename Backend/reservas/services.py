from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from .models import (
    Categoria,
    HorarioRestaurante,
    Mesa,
    Reserva,
    ReservaMesa,
    Restaurante,
    RestauranteCategoria,
    Usuario,
)


ZONA_HORARIA_LOCAL = ZoneInfo("America/Bogota")
DURACION_ESTANDAR = timedelta(hours=2)
ANTICIPACION_CIERRE = timedelta(hours=1)
GRACIA_NO_SHOW = timedelta(minutes=15)
MARCA_ACOMODACION_INTERNA = "Requiere acomodación interna del restaurante."


@dataclass(frozen=True)
class ResultadoCreacionReserva:
    reserva: Reserva
    mesa: Mesa | None
    requiere_acomodacion: bool


@dataclass(frozen=True)
class ResultadoCreacionRestaurante:
    restaurante: Restaurante
    administrador: Usuario


@dataclass(frozen=True)
class ResultadoConfiguracionHorario:
    horario: HorarioRestaurante
    creado: bool


@dataclass(frozen=True)
class ResultadoCreacionMesa:
    mesa: Mesa


def obtener_regla_capacidades(
    capacidades_activas,
    personas: int,
) -> tuple[list[int], bool]:
    """Devuelve las dos capacidades suficientes más cercanas."""
    if personas < 1:
        raise ValidationError({
            "personas": "El número de personas no puede ser 0.",
        })

    capacidades = sorted({int(capacidad) for capacidad in capacidades_activas})

    if not capacidades:
        return [], False

    requiere_acomodacion = personas > capacidades[-1]

    if requiere_acomodacion:
        return [], True

    permitidas = [
        capacidad
        for capacidad in capacidades
        if capacidad >= personas
    ][:2]
    return permitidas, False


def calcular_hora_fin(
    fecha: date,
    hora_inicio: time,
    hora_cierre: time,
) -> time:
    """Calcula dos horas de uso sin superar el cierre del restaurante."""
    inicio = datetime.combine(fecha, hora_inicio)
    cierre = datetime.combine(fecha, hora_cierre)
    return min(inicio + DURACION_ESTANDAR, cierre).time()


def es_inicio_reserva_futuro(
    fecha: date,
    hora_inicio: time,
    ahora_local: datetime | None = None,
) -> bool:
    """Indica si el inicio solicitado todavía no ha ocurrido en Bogotá."""
    ahora = ahora_local or timezone.localtime(
        timezone.now(),
        ZONA_HORARIA_LOCAL,
    )
    if ahora.tzinfo is None:
        ahora = ahora.replace(tzinfo=ZONA_HORARIA_LOCAL)
    else:
        ahora = ahora.astimezone(ZONA_HORARIA_LOCAL)

    inicio = datetime.combine(
        fecha,
        hora_inicio,
        tzinfo=ZONA_HORARIA_LOCAL,
    )
    return inicio > ahora


def _validar_fecha_y_hora(
    fecha: date,
    hora_inicio: time,
    horario: HorarioRestaurante,
) -> time:
    ahora_local = timezone.localtime(timezone.now(), ZONA_HORARIA_LOCAL)
    hoy = ahora_local.date()

    if fecha < hoy:
        raise ValidationError({
            "fecha": "La fecha no puede estar en el pasado.",
        })

    if (
        hora_inicio.minute % 15 != 0
        or hora_inicio.second != 0
        or hora_inicio.microsecond != 0
    ):
        raise ValidationError({
            "hora_inicio": (
                "La hora de inicio debe usar intervalos exactos de 15 minutos."
            ),
        })

    if not es_inicio_reserva_futuro(fecha, hora_inicio, ahora_local):
        raise ValidationError({
            "hora_inicio": "No se puede reservar una hora que ya pasó.",
        })

    apertura = datetime.combine(fecha, horario.hora_apertura)
    cierre = datetime.combine(fecha, horario.hora_cierre)
    inicio = datetime.combine(fecha, hora_inicio)
    ultima_reserva = cierre - ANTICIPACION_CIERRE

    if inicio < apertura or inicio > ultima_reserva:
        raise ValidationError({
            "hora_inicio": (
                "La reserva debe iniciar dentro del horario del restaurante y "
                "máximo una hora antes del cierre."
            ),
        })

    return calcular_hora_fin(fecha, hora_inicio, horario.hora_cierre)


def _combinar_notas_acomodacion(notas: str | None) -> str:
    notas_limpias = (notas or "").strip()
    notas_finales = (
        f"{MARCA_ACOMODACION_INTERNA} {notas_limpias}"
        if notas_limpias
        else MARCA_ACOMODACION_INTERNA
    )

    if len(notas_finales) > 500:
        raise ValidationError({
            "notas": "Las notas no pueden superar los 500 caracteres.",
        })

    return notas_finales


@transaction.atomic
def crear_reserva(
    *,
    restaurante: Restaurante,
    usuario: Usuario,
    fecha: date,
    hora_inicio: time,
    personas: int,
    capacidad_mesa: int | None = None,
    notas: str | None = None,
) -> ResultadoCreacionReserva:
    """Crea una reserva validada y asigna una mesa cuando corresponde."""
    if personas < 1:
        raise ValidationError({
            "personas": "El número de personas no puede ser 0.",
        })

    if usuario.rol != Usuario.Rol.CLIENTE or not usuario.is_active:
        raise ValidationError({
            "usuario": "La reserva requiere un cliente activo.",
        })

    try:
        restaurante_bloqueado = Restaurante.objects.select_for_update().get(
            pk=restaurante.pk,
            estado=Restaurante.Estado.ACTIVO,
        )
    except Restaurante.DoesNotExist as exc:
        raise ValidationError({
            "restaurante": "El restaurante no está activo.",
        }) from exc

    horario = HorarioRestaurante.objects.select_for_update().filter(
        restaurante=restaurante_bloqueado,
        dia_semana=fecha.isoweekday(),
        activo=True,
    ).first()

    if horario is None:
        raise ValidationError({
            "fecha": "El restaurante no atiende en la fecha seleccionada.",
        })

    hora_fin = _validar_fecha_y_hora(fecha, hora_inicio, horario)
    mesas_activas = list(
        Mesa.objects.select_for_update().filter(
            restaurante=restaurante_bloqueado,
            activa=True,
        ).order_by("capacidad_max", "id"),
    )

    if not mesas_activas:
        raise ValidationError({
            "restaurante": (
                "El restaurante no acepta reservas hasta configurar "
                "al menos una mesa activa."
            ),
        })

    capacidades_permitidas, requiere_acomodacion = obtener_regla_capacidades(
        (mesa.capacidad_max for mesa in mesas_activas),
        personas,
    )

    if requiere_acomodacion:
        if capacidad_mesa is not None:
            raise ValidationError({
                "capacidad_mesa": (
                    "No seleccione una mesa para grupos que requieren "
                    "acomodación interna."
                ),
            })

        reserva = Reserva(
            restaurante=restaurante_bloqueado,
            usuario=usuario,
            fecha=fecha,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            personas=personas,
            capacidad_mesa_solicitada=personas,
            estado=Reserva.Estado.CONFIRMADA,
            notas=_combinar_notas_acomodacion(notas),
        )
        reserva.full_clean()
        reserva.save(force_insert=True)
        return ResultadoCreacionReserva(
            reserva=reserva,
            mesa=None,
            requiere_acomodacion=True,
        )

    if capacidad_mesa is None:
        raise ValidationError({
            "capacidad_mesa": "Seleccione una capacidad de mesa.",
        })

    if capacidad_mesa not in capacidades_permitidas:
        raise ValidationError({
            "capacidad_mesa": (
                "Seleccione una de las dos capacidades suficientes más cercanas."
            ),
        })

    mesas_candidatas = [
        mesa
        for mesa in mesas_activas
        if mesa.capacidad_min <= personas
        and mesa.capacidad_max == capacidad_mesa
    ]
    mesa_disponible = next(
        (
            mesa
            for mesa in mesas_candidatas
            if not ReservaMesa.objects.filter(
                mesa=mesa,
                liberada_en__isnull=True,
                reserva__fecha=fecha,
                reserva__estado=Reserva.Estado.CONFIRMADA,
                reserva__hora_inicio__lt=hora_fin,
                reserva__hora_fin__gt=hora_inicio,
            ).exists()
        ),
        None,
    )

    if mesa_disponible is None:
        raise ValidationError({
            "hora_inicio": (
                "Ya no hay una mesa de la capacidad seleccionada disponible "
                "en ese horario."
            ),
        })

    reserva = Reserva(
        restaurante=restaurante_bloqueado,
        usuario=usuario,
        fecha=fecha,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
        personas=personas,
        capacidad_mesa_solicitada=capacidad_mesa,
        estado=Reserva.Estado.CONFIRMADA,
        notas=(notas or "").strip() or None,
    )
    reserva.full_clean()
    reserva.save(force_insert=True)

    asignacion = ReservaMesa(reserva=reserva, mesa=mesa_disponible)
    asignacion.full_clean()
    asignacion.save(force_insert=True)

    return ResultadoCreacionReserva(
        reserva=reserva,
        mesa=mesa_disponible,
        requiere_acomodacion=False,
    )


@transaction.atomic
def cancelar_reserva(*, reserva: Reserva) -> Reserva:
    """Cancela una reserva confirmada y libera sus mesas asignadas."""
    try:
        reserva_bloqueada = Reserva.objects.select_for_update().get(pk=reserva.pk)
    except Reserva.DoesNotExist as exc:
        raise ValidationError({
            "reserva": "La reserva no existe.",
        }) from exc

    if reserva_bloqueada.estado != Reserva.Estado.CONFIRMADA:
        raise ValidationError({
            "estado": "Solo se puede cancelar una reserva confirmada.",
        })

    cancelada_en = timezone.now()
    reserva_bloqueada.estado = Reserva.Estado.CANCELADA
    reserva_bloqueada.cancelada_en = cancelada_en
    reserva_bloqueada.save(
        update_fields=("estado", "cancelada_en", "actualizada_en"),
    )
    ReservaMesa.objects.filter(
        reserva=reserva_bloqueada,
        liberada_en__isnull=True,
    ).update(liberada_en=cancelada_en)

    return reserva_bloqueada


@transaction.atomic
def marcar_reserva_no_show(
    *,
    reserva: Reserva,
    administrador: Usuario,
) -> Reserva:
    """Marca la inasistencia después de la gracia y libera las mesas."""
    try:
        administrador_bloqueado = Usuario.objects.select_for_update().get(
            pk=administrador.pk,
            rol=Usuario.Rol.RESTAURANTE,
            estado=Usuario.Estado.ACTIVO,
        )
    except Usuario.DoesNotExist as exc:
        raise PermissionDenied(
            "Se requiere un administrador de restaurante activo.",
        ) from exc

    try:
        reserva_bloqueada = Reserva.objects.select_for_update().select_related(
            "restaurante",
        ).get(pk=reserva.pk)
    except Reserva.DoesNotExist as exc:
        raise ValidationError({
            "reservationId": "La reserva no existe.",
        }) from exc

    if reserva_bloqueada.restaurante.usuario_admin_id != administrador_bloqueado.id:
        raise PermissionDenied(
            "El usuario no administra el restaurante de esta reserva.",
        )

    if reserva_bloqueada.estado != Reserva.Estado.CONFIRMADA:
        raise ValidationError({
            "status": "Solo una reserva confirmada puede marcarse como no show.",
        })

    inicio_local = datetime.combine(
        reserva_bloqueada.fecha,
        reserva_bloqueada.hora_inicio,
        tzinfo=ZONA_HORARIA_LOCAL,
    )
    ahora_local = timezone.localtime(timezone.now(), ZONA_HORARIA_LOCAL)
    if ahora_local < inicio_local + GRACIA_NO_SHOW:
        raise ValidationError({
            "status": (
                "La reserva solo puede marcarse como no show después de "
                "15 minutos de gracia."
            ),
        })

    liberada_en = timezone.now()
    reserva_bloqueada.estado = Reserva.Estado.NO_SHOW
    reserva_bloqueada.save(update_fields=("estado", "actualizada_en"))
    ReservaMesa.objects.filter(
        reserva=reserva_bloqueada,
        liberada_en__isnull=True,
    ).update(liberada_en=liberada_en)
    return reserva_bloqueada


@transaction.atomic
def crear_restaurante(
    *,
    superadmin: Usuario,
    datos_restaurante: dict,
    datos_administrador: dict,
    categoria_ids: list[int],
    horarios: list[dict],
    mesas: list[dict],
) -> ResultadoCreacionRestaurante:
    """Crea el restaurante y toda su configuración inicial atómicamente."""
    try:
        Usuario.objects.select_for_update().get(
            pk=superadmin.pk,
            rol=Usuario.Rol.SUPERADMIN,
            estado=Usuario.Estado.ACTIVO,
        )
    except Usuario.DoesNotExist as exc:
        raise ValidationError({
            "authorization": "Se requiere un superadministrador activo.",
        }) from exc

    email = Usuario.objects.normalize_email(datos_administrador["email"])
    if Usuario.objects.filter(email__iexact=email).exists():
        raise ValidationError({
            "adminEmail": "Ya existe un usuario con este correo electrónico.",
        })

    categorias = list(
        Categoria.objects.select_for_update().filter(
            id__in=categoria_ids,
            activa=True,
        ).order_by("id"),
    )
    if len(categorias) != len(categoria_ids):
        raise ValidationError({
            "categoryIds": "Una o más categorías no existen o están inactivas.",
        })

    administrador = Usuario(
        nombres=datos_administrador["name"],
        email=email,
        telefono=datos_administrador.get("phone") or None,
        rol=Usuario.Rol.RESTAURANTE,
        estado=Usuario.Estado.ACTIVO,
    )
    administrador.set_password(datos_administrador["password"])
    administrador.full_clean()
    administrador.save(force_insert=True)

    restaurante = Restaurante(
        usuario_admin=administrador,
        nombre=datos_restaurante["name"],
        descripcion=datos_restaurante.get("description") or None,
        direccion=datos_restaurante["address"],
        ciudad=datos_restaurante["city"],
        departamento=datos_restaurante["department"],
        telefono=datos_restaurante.get("phone") or None,
        imagen_url=datos_restaurante.get("image") or None,
        latitud=datos_restaurante.get("latitude"),
        longitud=datos_restaurante.get("longitude"),
        estado=Restaurante.Estado.ACTIVO,
    )
    restaurante.full_clean()
    restaurante.save(force_insert=True)

    for categoria in categorias:
        relacion = RestauranteCategoria(
            restaurante=restaurante,
            categoria=categoria,
        )
        relacion.full_clean()
        relacion.save(force_insert=True)

    for datos_horario in horarios:
        horario = HorarioRestaurante(
            restaurante=restaurante,
            dia_semana=datos_horario["day"],
            hora_apertura=datos_horario["openingTime"],
            hora_cierre=datos_horario["closingTime"],
            activo=datos_horario["active"],
        )
        horario.full_clean()
        horario.save(force_insert=True)

    for datos_mesa in mesas:
        mesa = Mesa(
            restaurante=restaurante,
            nombre=datos_mesa["name"],
            capacidad_min=datos_mesa["minCapacity"],
            capacidad_max=datos_mesa["maxCapacity"],
            activa=datos_mesa["active"],
        )
        mesa.full_clean()
        mesa.save(force_insert=True)

    return ResultadoCreacionRestaurante(
        restaurante=restaurante,
        administrador=administrador,
    )


@transaction.atomic
def actualizar_restaurante(
    *,
    superadmin: Usuario,
    restaurante: Restaurante,
    cambios: dict,
) -> Restaurante:
    """Actualiza parcialmente un restaurante y, si llegan, sus categorías."""
    try:
        Usuario.objects.select_for_update().get(
            pk=superadmin.pk,
            rol=Usuario.Rol.SUPERADMIN,
            estado=Usuario.Estado.ACTIVO,
        )
    except Usuario.DoesNotExist as exc:
        raise ValidationError({
            "authorization": "Se requiere un superadministrador activo.",
        }) from exc

    try:
        restaurante_bloqueado = Restaurante.objects.select_for_update().get(
            pk=restaurante.pk,
        )
    except Restaurante.DoesNotExist as exc:
        raise ValidationError({
            "restaurantId": "El restaurante no existe.",
        }) from exc

    categoria_ids = cambios.pop("categoryIds", None)
    mapa_campos = {
        "name": "nombre",
        "description": "descripcion",
        "address": "direccion",
        "city": "ciudad",
        "department": "departamento",
        "phone": "telefono",
        "image": "imagen_url",
        "status": "estado",
    }
    campos_actualizados = []

    for campo_entrada, campo_modelo in mapa_campos.items():
        if campo_entrada not in cambios:
            continue

        valor = cambios[campo_entrada]
        if campo_entrada in {"description", "phone", "image"}:
            valor = valor or None

        setattr(restaurante_bloqueado, campo_modelo, valor)
        campos_actualizados.append(campo_modelo)

    restaurante_bloqueado.full_clean()
    if campos_actualizados:
        restaurante_bloqueado.save(
            update_fields=(*campos_actualizados, "actualizado_en"),
        )

    if categoria_ids is not None:
        categorias = list(
            Categoria.objects.select_for_update().filter(
                id__in=categoria_ids,
                activa=True,
            ).order_by("id"),
        )
        if len(categorias) != len(categoria_ids):
            raise ValidationError({
                "categoryIds": (
                    "Una o más categorías no existen o están inactivas."
                ),
            })

        RestauranteCategoria.objects.filter(
            restaurante=restaurante_bloqueado,
        ).delete()
        for categoria in categorias:
            relacion = RestauranteCategoria(
                restaurante=restaurante_bloqueado,
                categoria=categoria,
            )
            relacion.full_clean()
            relacion.save(force_insert=True)

    return restaurante_bloqueado


@transaction.atomic
def configurar_horario_restaurante(
    *,
    administrador: Usuario,
    restaurante: Restaurante,
    dia_semana: int,
    cambios: dict,
    crear_si_no_existe: bool,
) -> ResultadoConfiguracionHorario:
    """Crea o actualiza un horario del restaurante administrado."""
    if dia_semana not in range(1, 8):
        raise ValidationError({
            "day": "El día debe estar entre 1 y 7.",
        })

    try:
        administrador_bloqueado = Usuario.objects.select_for_update().get(
            pk=administrador.pk,
            rol=Usuario.Rol.RESTAURANTE,
            estado=Usuario.Estado.ACTIVO,
        )
    except Usuario.DoesNotExist as exc:
        raise PermissionDenied(
            "Se requiere un administrador de restaurante activo.",
        ) from exc

    try:
        restaurante_bloqueado = Restaurante.objects.select_for_update().get(
            pk=restaurante.pk,
            estado=Restaurante.Estado.ACTIVO,
        )
    except Restaurante.DoesNotExist as exc:
        raise ValidationError({
            "restaurantId": "El restaurante no existe o está inactivo.",
        }) from exc

    if restaurante_bloqueado.usuario_admin_id != administrador_bloqueado.id:
        raise PermissionDenied(
            "El usuario no administra este restaurante.",
        )

    horario = HorarioRestaurante.objects.select_for_update().filter(
        restaurante=restaurante_bloqueado,
        dia_semana=dia_semana,
    ).first()
    creado = horario is None

    if creado and not crear_si_no_existe:
        raise ValidationError({
            "day": "El restaurante aún no tiene un horario para este día.",
        })

    if horario is None:
        horario = HorarioRestaurante(
            restaurante=restaurante_bloqueado,
            dia_semana=dia_semana,
        )

    mapa_campos = {
        "openingTime": "hora_apertura",
        "closingTime": "hora_cierre",
        "active": "activo",
    }
    for campo_entrada, campo_modelo in mapa_campos.items():
        if campo_entrada in cambios:
            setattr(horario, campo_modelo, cambios[campo_entrada])

    horario.full_clean()
    horario.save(force_insert=creado)

    return ResultadoConfiguracionHorario(horario=horario, creado=creado)


def _bloquear_restaurante_administrado(
    *,
    administrador: Usuario,
    restaurante: Restaurante,
) -> Restaurante:
    try:
        administrador_bloqueado = Usuario.objects.select_for_update().get(
            pk=administrador.pk,
            rol=Usuario.Rol.RESTAURANTE,
            estado=Usuario.Estado.ACTIVO,
        )
    except Usuario.DoesNotExist as exc:
        raise PermissionDenied(
            "Se requiere un administrador de restaurante activo.",
        ) from exc

    try:
        restaurante_bloqueado = Restaurante.objects.select_for_update().get(
            pk=restaurante.pk,
            estado=Restaurante.Estado.ACTIVO,
        )
    except Restaurante.DoesNotExist as exc:
        raise ValidationError({
            "restaurantId": "El restaurante no existe o está inactivo.",
        }) from exc

    if restaurante_bloqueado.usuario_admin_id != administrador_bloqueado.id:
        raise PermissionDenied(
            "El usuario no administra este restaurante.",
        )

    return restaurante_bloqueado


@transaction.atomic
def actualizar_perfil_restaurante(
    *,
    administrador: Usuario,
    restaurante: Restaurante,
    cambios: dict,
) -> Restaurante:
    """Actualiza únicamente los datos operativos permitidos al restaurante."""
    restaurante_bloqueado = _bloquear_restaurante_administrado(
        administrador=administrador,
        restaurante=restaurante,
    )

    mapa_campos = {
        "description": "descripcion",
        "phone": "telefono",
    }
    campos_actualizados = []
    for campo_entrada, campo_modelo in mapa_campos.items():
        if campo_entrada not in cambios:
            continue

        setattr(
            restaurante_bloqueado,
            campo_modelo,
            cambios[campo_entrada] or None,
        )
        campos_actualizados.append(campo_modelo)

    restaurante_bloqueado.full_clean()
    restaurante_bloqueado.save(
        update_fields=(*campos_actualizados, "actualizado_en"),
    )
    return restaurante_bloqueado


def obtener_estadisticas_restaurante(
    *,
    restaurante: Restaurante,
    fecha_inicial: date,
    fecha_final: date,
) -> dict:
    """Calcula indicadores operativos de un restaurante en un periodo corto."""
    now_local = timezone.localtime(timezone.now(), ZONA_HORARIA_LOCAL)
    today = now_local.date()
    current_time = now_local.time().replace(tzinfo=None)

    active_table_ids = list(
        Mesa.objects.filter(
            restaurante=restaurante,
            activa=True,
        ).values_list("id", flat=True),
    )
    occupied_table_ids = set(
        ReservaMesa.objects.filter(
            mesa_id__in=active_table_ids,
            liberada_en__isnull=True,
            reserva__restaurante=restaurante,
            reserva__estado=Reserva.Estado.CONFIRMADA,
            reserva__fecha=today,
            reserva__hora_inicio__lte=current_time,
            reserva__hora_fin__gt=current_time,
        ).values_list("mesa_id", flat=True),
    )

    period_reservations = Reserva.objects.filter(
        restaurante=restaurante,
        fecha__range=(fecha_inicial, fecha_final),
    )
    status_counts = {
        Reserva.Estado.CONFIRMADA: 0,
        Reserva.Estado.CANCELADA: 0,
        Reserva.Estado.NO_SHOW: 0,
    }
    daily_counts = {}
    for row in period_reservations.values("fecha", "estado"):
        status = row["estado"]
        status_counts[status] = status_counts.get(status, 0) + 1
        key = (row["fecha"], status)
        daily_counts[key] = daily_counts.get(key, 0) + 1

    dates = [
        fecha_inicial + timedelta(days=offset)
        for offset in range((fecha_final - fecha_inicial).days + 1)
    ]
    day_names = ("Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom")

    schedules = list(
        HorarioRestaurante.objects.filter(
            restaurante=restaurante,
            activo=True,
        ).values_list("hora_apertura", "hora_cierre"),
    )
    if schedules:
        first_hour = min(opening.hour for opening, _ in schedules)
        last_hour = max(max(opening.hour, closing.hour - 1) for opening, closing in schedules)
    else:
        first_hour, last_hour = 8, 22
    occupancy_hours = list(range(first_hour, last_hour + 1, 2))

    assignments = list(
        ReservaMesa.objects.filter(
            mesa_id__in=active_table_ids,
            liberada_en__isnull=True,
            reserva__restaurante=restaurante,
            reserva__estado=Reserva.Estado.CONFIRMADA,
            reserva__fecha__range=(fecha_inicial, fecha_final),
        ).values("reserva__hora_inicio", "reserva__hora_fin"),
    )
    occupancy_denominator = len(active_table_ids) * len(dates)
    occupancy_values = []
    for hour in occupancy_hours:
        bucket_time = time(hour=hour)
        occupied_assignments = sum(
            1
            for assignment in assignments
            if assignment["reserva__hora_inicio"] <= bucket_time
            < assignment["reserva__hora_fin"]
        )
        percentage = (
            round(occupied_assignments * 100 / occupancy_denominator)
            if occupancy_denominator
            else 0
        )
        occupancy_values.append(min(percentage, 100))

    return {
        "period": {
            "startDate": fecha_inicial.isoformat(),
            "endDate": fecha_final.isoformat(),
        },
        "summary": {
            "todayReservations": Reserva.objects.filter(
                restaurante=restaurante,
                fecha=today,
                estado=Reserva.Estado.CONFIRMADA,
            ).count(),
            "totalReservations": period_reservations.count(),
            "activeTables": len(active_table_ids),
            "availableTables": max(len(active_table_ids) - len(occupied_table_ids), 0),
            "occupiedTables": len(occupied_table_ids),
            "noShows": status_counts[Reserva.Estado.NO_SHOW],
        },
        "reservationsByDay": {
            "labels": [f"{day_names[value.weekday()]} {value.day:02d}" for value in dates],
            "confirmed": [
                daily_counts.get((value, Reserva.Estado.CONFIRMADA), 0)
                for value in dates
            ],
            "cancelled": [
                daily_counts.get((value, Reserva.Estado.CANCELADA), 0)
                for value in dates
            ],
            "noShows": [
                daily_counts.get((value, Reserva.Estado.NO_SHOW), 0)
                for value in dates
            ],
        },
        "statusDistribution": {
            "labels": ["Confirmadas", "Canceladas", "No show"],
            "values": [
                status_counts[Reserva.Estado.CONFIRMADA],
                status_counts[Reserva.Estado.CANCELADA],
                status_counts[Reserva.Estado.NO_SHOW],
            ],
        },
        "occupancyByHour": {
            "labels": [f"{hour:02d}:00" for hour in occupancy_hours],
            "values": occupancy_values,
        },
    }


@transaction.atomic
def crear_mesa_restaurante(
    *,
    administrador: Usuario,
    restaurante: Restaurante,
    datos: dict,
) -> ResultadoCreacionMesa:
    """Crea una mesa dentro del restaurante administrado."""
    restaurante_bloqueado = _bloquear_restaurante_administrado(
        administrador=administrador,
        restaurante=restaurante,
    )

    if Mesa.objects.filter(
        restaurante=restaurante_bloqueado,
        nombre__iexact=datos["name"],
    ).exists():
        raise ValidationError({
            "name": "Ya existe una mesa con este nombre en el restaurante.",
        })

    mesa = Mesa(
        restaurante=restaurante_bloqueado,
        nombre=datos["name"],
        capacidad_min=datos["minCapacity"],
        capacidad_max=datos["maxCapacity"],
        activa=datos["active"],
    )
    mesa.full_clean()
    mesa.save(force_insert=True)
    return ResultadoCreacionMesa(mesa=mesa)


@transaction.atomic
def actualizar_mesa_restaurante(
    *,
    administrador: Usuario,
    restaurante: Restaurante,
    mesa: Mesa,
    cambios: dict,
) -> Mesa:
    """Actualiza una mesa sin eliminar sus asignaciones históricas."""
    restaurante_bloqueado = _bloquear_restaurante_administrado(
        administrador=administrador,
        restaurante=restaurante,
    )

    try:
        mesa_bloqueada = Mesa.objects.select_for_update().get(
            pk=mesa.pk,
            restaurante=restaurante_bloqueado,
        )
    except Mesa.DoesNotExist as exc:
        raise ValidationError({
            "tableId": "La mesa no pertenece a este restaurante.",
        }) from exc

    if "name" in cambios and Mesa.objects.filter(
        restaurante=restaurante_bloqueado,
        nombre__iexact=cambios["name"],
    ).exclude(pk=mesa_bloqueada.pk).exists():
        raise ValidationError({
            "name": "Ya existe una mesa con este nombre en el restaurante.",
        })

    mapa_campos = {
        "name": "nombre",
        "minCapacity": "capacidad_min",
        "maxCapacity": "capacidad_max",
        "active": "activa",
    }
    campos_actualizados = []
    for campo_entrada, campo_modelo in mapa_campos.items():
        if campo_entrada in cambios:
            setattr(mesa_bloqueada, campo_modelo, cambios[campo_entrada])
            campos_actualizados.append(campo_modelo)

    mesa_bloqueada.full_clean()
    mesa_bloqueada.save(
        update_fields=(*campos_actualizados, "actualizado_en"),
    )
    return mesa_bloqueada
