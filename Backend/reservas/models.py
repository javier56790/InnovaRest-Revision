from decimal import Decimal

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class UsuarioManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El correo electrónico es obligatorio.')
        if not password:
            raise ValueError('La contraseña es obligatoria.')

        email = self.normalize_email(email)
        extra_fields.setdefault('rol', self.model.Rol.CLIENTE)
        extra_fields.setdefault('estado', self.model.Estado.ACTIVO)

        usuario = self.model(email=email, **extra_fields)
        usuario.set_password(password)
        usuario.save(using=self._db)
        return usuario

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields['rol'] = self.model.Rol.SUPERADMIN
        extra_fields['estado'] = self.model.Estado.ACTIVO
        return self.create_user(email, password, **extra_fields)


class Usuario(AbstractBaseUser):
    class Rol(models.TextChoices):
        CLIENTE = 'CLIENTE', 'Cliente'
        RESTAURANTE = 'RESTAURANTE', 'Restaurante'
        SUPERADMIN = 'SUPERADMIN', 'Superadministrador'

    class Estado(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        BLOQUEADO = 'BLOQUEADO', 'Bloqueado'

    id = models.BigAutoField(primary_key=True)
    nombres = models.CharField(max_length=120)
    email = models.EmailField(max_length=254, unique=True)
    password = models.CharField(max_length=255, db_column='contrasena_hash')
    telefono = models.CharField(max_length=30, blank=True, null=True)
    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.CLIENTE)
    estado = models.CharField(
        max_length=12,
        choices=Estado.choices,
        default=Estado.ACTIVO,
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    last_login = None

    objects = UsuarioManager()

    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = ['nombres']

    class Meta:
        managed = False
        db_table = 'usuarios'
        ordering = ['nombres', 'email']

    def clean(self):
        super().clean()
        self.email = self.__class__.objects.normalize_email(self.email)

    @property
    def is_active(self):
        return self.estado == self.Estado.ACTIVO

    @property
    def is_staff(self):
        return self.rol == self.Rol.SUPERADMIN

    @property
    def is_superuser(self):
        return self.rol == self.Rol.SUPERADMIN

    def has_perm(self, perm, obj=None):
        return self.is_active and self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_active and self.is_superuser

    def get_full_name(self):
        return self.nombres

    def get_short_name(self):
        return self.nombres.split()[0] if self.nombres else self.email

    def __str__(self):
        return self.email


class Categoria(models.Model):
    id = models.SmallAutoField(primary_key=True)
    nombre = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=80, unique=True)
    activa = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'categorias'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Restaurante(models.Model):
    class Estado(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        INACTIVO = 'INACTIVO', 'Inactivo'

    id = models.BigAutoField(primary_key=True)
    usuario_admin = models.OneToOneField(
        Usuario,
        on_delete=models.PROTECT,
        db_column='usuario_admin_id',
        related_name='restaurante_administrado',
    )
    categorias = models.ManyToManyField(
        Categoria,
        through='RestauranteCategoria',
        related_name='restaurantes',
    )
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    direccion = models.CharField(max_length=200)
    ciudad = models.CharField(max_length=100)
    departamento = models.CharField(max_length=100)
    telefono = models.CharField(max_length=30, blank=True, null=True)
    imagen_url = models.URLField(max_length=500, blank=True, null=True)
    latitud = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(Decimal('-90')),
            MaxValueValidator(Decimal('90')),
        ],
    )
    longitud = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(Decimal('-180')),
            MaxValueValidator(Decimal('180')),
        ],
    )
    calificacion_promedio = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[
            MinValueValidator(Decimal('0')),
            MaxValueValidator(Decimal('5')),
        ],
    )
    total_calificaciones = models.PositiveIntegerField(default=0)
    estado = models.CharField(
        max_length=10,
        choices=Estado.choices,
        default=Estado.ACTIVO,
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'restaurantes'
        ordering = ['nombre']

    def clean(self):
        super().clean()
        usuario_admin = self._state.fields_cache.get('usuario_admin')

        if usuario_admin is None and self.usuario_admin_id is not None:
            usuario_admin = self.usuario_admin

        if usuario_admin is not None and usuario_admin.rol != Usuario.Rol.RESTAURANTE:
            raise ValidationError({
                'usuario_admin': (
                    'El administrador debe tener el rol RESTAURANTE.'
                ),
            })

    def __str__(self):
        return self.nombre


class RestauranteCategoria(models.Model):
    pk = models.CompositePrimaryKey('restaurante_id', 'categoria_id')
    restaurante = models.ForeignKey(
        Restaurante,
        on_delete=models.CASCADE,
        db_column='restaurante_id',
        related_name='relaciones_categoria',
    )
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        db_column='categoria_id',
        related_name='relaciones_restaurante',
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'restaurante_categoria'
        ordering = ['restaurante_id', 'categoria_id']

    def __str__(self):
        return f'{self.restaurante_id} - {self.categoria_id}'


class HorarioRestaurante(models.Model):
    class DiaSemana(models.IntegerChoices):
        LUNES = 1, 'Lunes'
        MARTES = 2, 'Martes'
        MIERCOLES = 3, 'Miércoles'
        JUEVES = 4, 'Jueves'
        VIERNES = 5, 'Viernes'
        SABADO = 6, 'Sábado'
        DOMINGO = 7, 'Domingo'

    id = models.BigAutoField(primary_key=True)
    restaurante = models.ForeignKey(
        Restaurante,
        on_delete=models.CASCADE,
        db_column='restaurante_id',
        related_name='horarios',
    )
    dia_semana = models.PositiveSmallIntegerField(
        choices=DiaSemana.choices,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(7),
        ],
    )
    hora_apertura = models.TimeField()
    hora_cierre = models.TimeField()
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'horarios_restaurante'
        ordering = ['restaurante_id', 'dia_semana']
        constraints = [
            models.UniqueConstraint(
                fields=['restaurante', 'dia_semana'],
                name='uk_horarios_restaurante_dia',
            ),
        ]

    def clean(self):
        super().clean()

        if (
            self.hora_apertura is not None
            and self.hora_cierre is not None
            and self.hora_cierre <= self.hora_apertura
        ):
            raise ValidationError({
                'hora_cierre': (
                    'La hora de cierre debe ser posterior a la apertura.'
                ),
            })

    def __str__(self):
        return f'{self.restaurante_id} - {self.get_dia_semana_display()}'


class Mesa(models.Model):
    id = models.BigAutoField(primary_key=True)
    restaurante = models.ForeignKey(
        Restaurante,
        on_delete=models.CASCADE,
        db_column='restaurante_id',
        related_name='mesas',
    )
    nombre = models.CharField(max_length=50)
    capacidad_min = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )
    capacidad_max = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)],
    )
    activa = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'mesas'
        ordering = ['restaurante_id', 'nombre']
        constraints = [
            models.UniqueConstraint(
                fields=['restaurante', 'nombre'],
                name='uk_mesas_restaurante_nombre',
            ),
        ]

    def clean(self):
        super().clean()

        if (
            self.capacidad_min is not None
            and self.capacidad_max is not None
            and self.capacidad_max < self.capacidad_min
        ):
            raise ValidationError({
                'capacidad_max': (
                    'La capacidad máxima debe ser igual o superior a la mínima.'
                ),
            })

    def __str__(self):
        return self.nombre


class Reserva(models.Model):
    class Estado(models.TextChoices):
        CONFIRMADA = 'CONFIRMADA', 'Confirmada'
        CANCELADA = 'CANCELADA', 'Cancelada'
        NO_SHOW = 'NO_SHOW', 'No show'

    id = models.BigAutoField(primary_key=True)
    restaurante = models.ForeignKey(
        Restaurante,
        on_delete=models.PROTECT,
        db_column='restaurante_id',
        related_name='reservas',
    )
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        db_column='usuario_id',
        related_name='reservas',
    )
    mesas = models.ManyToManyField(
        Mesa,
        through='ReservaMesa',
        related_name='reservas',
    )
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    personas = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)],
    )
    capacidad_mesa_solicitada = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)],
    )
    estado = models.CharField(
        max_length=15,
        choices=Estado.choices,
        default=Estado.CONFIRMADA,
    )
    notas = models.CharField(max_length=500, blank=True, null=True)
    cancelada_en = models.DateTimeField(blank=True, null=True)
    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'reservas'
        ordering = ['-fecha', '-hora_inicio']

    def clean(self):
        super().clean()
        usuario = self._state.fields_cache.get('usuario')

        if usuario is None and self.usuario_id is not None:
            usuario = self.usuario

        errors = {}

        if usuario is not None and usuario.rol != Usuario.Rol.CLIENTE:
            errors['usuario'] = 'El titular de la reserva debe tener el rol CLIENTE.'

        if (
            self.personas is not None
            and self.capacidad_mesa_solicitada is not None
            and self.capacidad_mesa_solicitada < self.personas
        ):
            errors['capacidad_mesa_solicitada'] = (
                'La capacidad solicitada debe cubrir el número de personas.'
            )

        if (
            self.hora_inicio is not None
            and self.hora_fin is not None
            and self.hora_fin <= self.hora_inicio
        ):
            errors['hora_fin'] = (
                'La hora final debe ser posterior a la hora de inicio.'
            )

        if self.hora_inicio is not None and (
            self.hora_inicio.minute % 15 != 0
            or self.hora_inicio.second != 0
            or self.hora_inicio.microsecond != 0
        ):
            errors['hora_inicio'] = (
                'La hora de inicio debe usar intervalos exactos de 15 minutos.'
            )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f'Reserva {self.pk}' if self.pk is not None else 'Reserva sin guardar'


class ReservaMesa(models.Model):
    id = models.BigAutoField(primary_key=True)
    reserva = models.ForeignKey(
        Reserva,
        on_delete=models.CASCADE,
        db_column='reserva_id',
        related_name='asignaciones_mesa',
    )
    mesa = models.ForeignKey(
        Mesa,
        on_delete=models.PROTECT,
        db_column='mesa_id',
        related_name='asignaciones_reserva',
    )
    liberada_en = models.DateTimeField(blank=True, null=True)
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'reserva_mesa'
        ordering = ['reserva_id', 'mesa_id']
        constraints = [
            models.UniqueConstraint(
                fields=['reserva', 'mesa'],
                name='uk_reserva_mesa_asignacion',
            ),
        ]

    def clean(self):
        super().clean()
        reserva = self._state.fields_cache.get('reserva')
        mesa = self._state.fields_cache.get('mesa')

        if reserva is None and self.reserva_id is not None:
            reserva = self.reserva
        if mesa is None and self.mesa_id is not None:
            mesa = self.mesa

        if reserva is None or mesa is None:
            return

        reserva_restaurante_id = reserva.restaurante_id
        mesa_restaurante_id = mesa.restaurante_id

        if (
            reserva_restaurante_id is not None
            and mesa_restaurante_id is not None
            and reserva_restaurante_id != mesa_restaurante_id
        ):
            raise ValidationError({
                'mesa': (
                    'La mesa debe pertenecer al mismo restaurante de la reserva.'
                ),
            })

    def __str__(self):
        return f'{self.reserva_id} - {self.mesa_id}'
