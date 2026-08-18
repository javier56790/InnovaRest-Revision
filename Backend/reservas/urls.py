from django.urls import path

from .views import (
    CategoriaListView,
    HorarioRestauranteAdminDetailView,
    HorarioRestauranteAdminListView,
    LoginView,
    MesaRestauranteAdminDetailView,
    MesaRestauranteAdminListView,
    MeView,
    PasswordChangeView,
    RegisterView,
    ReservaCancelView,
    ReservaCollectionView,
    ReservaNoShowView,
    RestauranteAvailabilityView,
    RestauranteAdminProfileView,
    RestauranteAdminStatisticsView,
    RestauranteDetailView,
    RestauranteListView,
)

app_name = "reservas"

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path(
        "auth/password/",
        PasswordChangeView.as_view(),
        name="auth-password",
    ),
    path("categorias/", CategoriaListView.as_view(), name="categoria-list"),
    path(
        "reservas/",
        ReservaCollectionView.as_view(),
        name="reserva-collection",
    ),
    path(
        "reservas/<int:pk>/cancelar/",
        ReservaCancelView.as_view(),
        name="reserva-cancel",
    ),
    path(
        "reservas/<int:pk>/no-show/",
        ReservaNoShowView.as_view(),
        name="reserva-no-show",
    ),
    path("restaurantes/", RestauranteListView.as_view(), name="restaurante-list"),
    path(
        "restaurantes/<int:pk>/",
        RestauranteDetailView.as_view(),
        name="restaurante-detail",
    ),
    path(
        "restaurantes/<int:pk>/disponibilidad/",
        RestauranteAvailabilityView.as_view(),
        name="restaurante-availability",
    ),
    path(
        "restaurantes/<int:pk>/perfil/",
        RestauranteAdminProfileView.as_view(),
        name="restaurante-admin-profile",
    ),
    path(
        "restaurantes/<int:pk>/estadisticas/",
        RestauranteAdminStatisticsView.as_view(),
        name="restaurante-admin-statistics",
    ),
    path(
        "restaurantes/<int:pk>/horarios/",
        HorarioRestauranteAdminListView.as_view(),
        name="restaurante-schedule-list",
    ),
    path(
        "restaurantes/<int:pk>/horarios/<int:day>/",
        HorarioRestauranteAdminDetailView.as_view(),
        name="restaurante-schedule-detail",
    ),
    path(
        "restaurantes/<int:pk>/mesas/",
        MesaRestauranteAdminListView.as_view(),
        name="restaurante-table-list",
    ),
    path(
        "restaurantes/<int:pk>/mesas/<int:table_id>/",
        MesaRestauranteAdminDetailView.as_view(),
        name="restaurante-table-detail",
    ),
]
