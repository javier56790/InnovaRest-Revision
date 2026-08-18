from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from .serializers import (
    ClienteRegisterSerializer,
    EstadisticasRestauranteQuerySerializer,
    HorarioReplaceSerializer,
    HorarioUpdateSerializer,
    LoginSerializer,
    MesaCreateSerializer,
    MesaUpdateSerializer,
    PasswordChangeSerializer,
    ReservaCreateSerializer,
    ReservaListQuerySerializer,
    RestauranteCreateSerializer,
    RestauranteAdminProfileUpdateSerializer,
    RestauranteUpdateSerializer,
    UsuarioProfileUpdateSerializer,
)
from .services import (
    calcular_hora_fin,
    es_inicio_reserva_futuro,
    obtener_regla_capacidades,
)


class ReglaCapacidadesTests(SimpleTestCase):
    def test_habilita_las_dos_capacidades_suficientes_mas_cercanas(self):
        permitidas, requiere_acomodacion = obtener_regla_capacidades(
            [2, 4, 6, 8, 12],
            3,
        )

        self.assertEqual(permitidas, [4, 6])
        self.assertFalse(requiere_acomodacion)

    def test_solo_habilita_la_capacidad_disponible_cuando_no_hay_dos(self):
        permitidas, requiere_acomodacion = obtener_regla_capacidades(
            [2, 4, 6, 8, 12],
            9,
        )

        self.assertEqual(permitidas, [12])
        self.assertFalse(requiere_acomodacion)

    def test_grupo_mayor_requiere_acomodacion_interna(self):
        permitidas, requiere_acomodacion = obtener_regla_capacidades(
            [2, 4, 6, 8, 12],
            13,
        )

        self.assertEqual(permitidas, [])
        self.assertTrue(requiere_acomodacion)

    def test_sin_mesas_no_habilita_acomodacion_interna(self):
        permitidas, requiere_acomodacion = obtener_regla_capacidades([], 4)

        self.assertEqual(permitidas, [])
        self.assertFalse(requiere_acomodacion)

    def test_rechaza_cero_personas(self):
        with self.assertRaisesMessage(
            ValidationError,
            "El número de personas no puede ser 0.",
        ):
            obtener_regla_capacidades([2, 4], 0)


class DuracionReservaTests(SimpleTestCase):
    def test_usa_dos_horas_completas_cuando_caben_antes_del_cierre(self):
        hora_fin = calcular_hora_fin(
            date(2026, 8, 20),
            time(15, 0),
            time(22, 0),
        )

        self.assertEqual(hora_fin, time(17, 0))

    def test_limita_la_duracion_al_cierre_del_restaurante(self):
        hora_fin = calcular_hora_fin(
            date(2026, 8, 20),
            time(21, 0),
            time(22, 0),
        )

        self.assertEqual(hora_fin, time(22, 0))


class InicioReservaFuturoTests(SimpleTestCase):
    ahora = datetime(
        2026,
        8,
        17,
        14,
        30,
        tzinfo=ZoneInfo("America/Bogota"),
    )

    def test_rechaza_una_hora_anterior_del_mismo_dia(self):
        self.assertFalse(es_inicio_reserva_futuro(
            date(2026, 8, 17),
            time(14, 15),
            self.ahora,
        ))

    def test_rechaza_la_hora_actual(self):
        self.assertFalse(es_inicio_reserva_futuro(
            date(2026, 8, 17),
            time(14, 30),
            self.ahora,
        ))

    def test_acepta_una_hora_futura(self):
        self.assertTrue(es_inicio_reserva_futuro(
            date(2026, 8, 17),
            time(14, 45),
            self.ahora,
        ))


class ReservaCreateSerializerTests(SimpleTestCase):
    def test_acepta_una_reserva_normal(self):
        serializer = ReservaCreateSerializer(data={
            "restaurantId": 1,
            "date": "2026-08-20",
            "time": "15:00",
            "people": 2,
            "tableCapacity": 2,
            "notes": "Mesa cerca de una ventana.",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_acepta_grupo_grande_sin_capacidad(self):
        serializer = ReservaCreateSerializer(data={
            "restaurantId": 1,
            "date": "2026-08-20",
            "time": "18:00",
            "people": 13,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn("tableCapacity", serializer.validated_data)

    def test_rechaza_cero_personas(self):
        serializer = ReservaCreateSerializer(data={
            "restaurantId": 1,
            "date": "2026-08-20",
            "time": "15:00",
            "people": 0,
        })

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            str(serializer.errors["people"][0]),
            "El número de personas no puede ser 0.",
        )


class ReservaListQuerySerializerTests(SimpleTestCase):
    def test_acepta_consulta_sin_filtros(self):
        serializer = ReservaListQuerySerializer(data={})

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_acepta_filtro_de_restaurante(self):
        serializer = ReservaListQuerySerializer(data={
            "restaurantId": 3,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rechaza_restaurante_cero(self):
        serializer = ReservaListQuerySerializer(data={
            "restaurantId": 0,
        })

        self.assertFalse(serializer.is_valid())


class LoginSerializerTests(SimpleTestCase):
    def test_acepta_credenciales(self):
        serializer = LoginSerializer(data={
            "email": "cliente@innovarest.test",
            "password": "InnovaRest123!",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_requiere_contrasena(self):
        serializer = LoginSerializer(data={
            "email": "cliente@innovarest.test",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("password", serializer.errors)


class ClienteRegisterSerializerTests(SimpleTestCase):
    def test_acepta_un_cliente_valido(self):
        serializer = ClienteRegisterSerializer(data={
            "name": "Cliente Nuevo",
            "email": "nuevo@innovarest.test",
            "phone": "3001112233",
            "password": "Cliente123!",
            "confirmPassword": "Cliente123!",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rechaza_contrasenas_diferentes(self):
        serializer = ClienteRegisterSerializer(data={
            "name": "Cliente Nuevo",
            "email": "nuevo@innovarest.test",
            "password": "Cliente123!",
            "confirmPassword": "OtraClave123!",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("confirmPassword", serializer.errors)


class UsuarioProfileUpdateSerializerTests(SimpleTestCase):
    def test_acepta_datos_de_perfil(self):
        serializer = UsuarioProfileUpdateSerializer(data={
            "name": "Cliente Actualizado",
            "email": "actualizado@innovarest.test",
            "phone": "3002223344",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_requiere_al_menos_un_dato(self):
        serializer = UsuarioProfileUpdateSerializer(data={})

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)


class PasswordChangeSerializerTests(SimpleTestCase):
    def test_rechaza_confirmacion_diferente(self):
        serializer = PasswordChangeSerializer(data={
            "currentPassword": "Cliente123!",
            "newPassword": "NuevaClave123!",
            "confirmNewPassword": "OtraClave123!",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("confirmNewPassword", serializer.errors)

    def test_rechaza_reutilizar_la_contrasena_actual(self):
        serializer = PasswordChangeSerializer(data={
            "currentPassword": "Cliente123!",
            "newPassword": "Cliente123!",
            "confirmNewPassword": "Cliente123!",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("newPassword", serializer.errors)


class RestauranteAdminProfileUpdateSerializerTests(SimpleTestCase):
    def test_acepta_descripcion_y_telefono(self):
        serializer = RestauranteAdminProfileUpdateSerializer(data={
            "description": "Nueva descripción pública.",
            "phone": "3100000000",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rechaza_campos_estructurales(self):
        serializer = RestauranteAdminProfileUpdateSerializer(data={
            "name": "Nombre no autorizado",
            "city": "Otra ciudad",
            "email": "otro@example.com",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)
        self.assertIn("city", serializer.errors)
        self.assertIn("email", serializer.errors)

    def test_rechaza_solicitud_vacia(self):
        serializer = RestauranteAdminProfileUpdateSerializer(data={})

        self.assertFalse(serializer.is_valid())


class EstadisticasRestauranteQuerySerializerTests(SimpleTestCase):
    def test_acepta_periodo_de_hasta_31_dias(self):
        serializer = EstadisticasRestauranteQuerySerializer(data={
            "startDate": "2026-08-01",
            "endDate": "2026-08-31",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rechaza_periodo_incompleto(self):
        serializer = EstadisticasRestauranteQuerySerializer(data={
            "startDate": "2026-08-01",
        })

        self.assertFalse(serializer.is_valid())

    def test_rechaza_periodo_mayor_a_31_dias(self):
        serializer = EstadisticasRestauranteQuerySerializer(data={
            "startDate": "2026-07-01",
            "endDate": "2026-08-01",
        })

        self.assertFalse(serializer.is_valid())

    def test_rechaza_fechas_invertidas(self):
        serializer = EstadisticasRestauranteQuerySerializer(data={
            "startDate": "2026-08-20",
            "endDate": "2026-08-01",
        })

        self.assertFalse(serializer.is_valid())


class RestauranteCreateSerializerTests(SimpleTestCase):
    def setUp(self):
        self.payload = {
            "name": "Restaurante de prueba",
            "description": "Creado para validar el contrato.",
            "address": "Calle 1 # 2-3",
            "city": "Popayán",
            "department": "Cauca",
            "phone": "3000000000",
            "admin": {
                "name": "Administrador de prueba",
                "email": "administrador@prueba.test",
                "password": "Temporal123!",
            },
            "categoryIds": [1],
            "schedules": [
                {
                    "day": 1,
                    "openingTime": "11:00",
                    "closingTime": "22:00",
                    "active": True,
                },
            ],
            "tables": [
                {
                    "name": "Mesa 01",
                    "minCapacity": 1,
                    "maxCapacity": 2,
                    "active": True,
                },
            ],
        }

    def test_acepta_configuracion_completa(self):
        serializer = RestauranteCreateSerializer(data=self.payload)

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rechaza_dias_repetidos(self):
        self.payload["schedules"].append(dict(self.payload["schedules"][0]))
        serializer = RestauranteCreateSerializer(data=self.payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("schedules", serializer.errors)

    def test_rechaza_categorias_repetidas(self):
        self.payload["categoryIds"] = [1, 1]
        serializer = RestauranteCreateSerializer(data=self.payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("categoryIds", serializer.errors)

    def test_rechaza_horario_invertido(self):
        self.payload["schedules"][0]["closingTime"] = "10:00"
        serializer = RestauranteCreateSerializer(data=self.payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("schedules", serializer.errors)

    def test_rechaza_nombres_de_mesa_repetidos(self):
        self.payload["tables"].append(dict(self.payload["tables"][0]))
        serializer = RestauranteCreateSerializer(data=self.payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("tables", serializer.errors)

    def test_rechaza_capacidad_invertida(self):
        self.payload["tables"][0]["minCapacity"] = 4
        self.payload["tables"][0]["maxCapacity"] = 2
        serializer = RestauranteCreateSerializer(data=self.payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("tables", serializer.errors)


class RestauranteUpdateSerializerTests(SimpleTestCase):
    def test_acepta_actualizacion_parcial(self):
        serializer = RestauranteUpdateSerializer(data={
            "name": "Nuevo nombre",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_requiere_al_menos_un_cambio(self):
        serializer = RestauranteUpdateSerializer(data={})

        self.assertFalse(serializer.is_valid())

    def test_rechaza_estado_desconocido(self):
        serializer = RestauranteUpdateSerializer(data={
            "status": "ELIMINADO",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("status", serializer.errors)

    def test_rechaza_categorias_repetidas(self):
        serializer = RestauranteUpdateSerializer(data={
            "categoryIds": [1, 1],
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("categoryIds", serializer.errors)


class HorarioAdminSerializerTests(SimpleTestCase):
    def test_acepta_reemplazo_completo(self):
        serializer = HorarioReplaceSerializer(data={
            "openingTime": "11:00",
            "closingTime": "22:00",
            "active": True,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rechaza_horario_invertido(self):
        serializer = HorarioReplaceSerializer(data={
            "openingTime": "22:00",
            "closingTime": "11:00",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("closingTime", serializer.errors)

    def test_acepta_actualizar_solo_el_estado(self):
        serializer = HorarioUpdateSerializer(data={
            "active": False,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_requiere_un_cambio_en_patch(self):
        serializer = HorarioUpdateSerializer(data={})

        self.assertFalse(serializer.is_valid())


class MesaAdminSerializerTests(SimpleTestCase):
    def test_acepta_crear_mesa(self):
        serializer = MesaCreateSerializer(data={
            "name": "Mesa 03",
            "minCapacity": 1,
            "maxCapacity": 6,
            "active": True,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rechaza_capacidad_invertida(self):
        serializer = MesaCreateSerializer(data={
            "name": "Mesa 03",
            "minCapacity": 6,
            "maxCapacity": 2,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("maxCapacity", serializer.errors)

    def test_acepta_desactivar_mesa(self):
        serializer = MesaUpdateSerializer(data={
            "active": False,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_requiere_un_cambio_en_patch(self):
        serializer = MesaUpdateSerializer(data={})

        self.assertFalse(serializer.is_valid())
