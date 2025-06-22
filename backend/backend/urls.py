from django.contrib import admin
from django.urls import path, include
from api.views import CreateUserView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api-auth/", include("rest_framework.urls")),
    path("api/", include("api.urls")), # Apenas a regra genérica da API permanece
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
    # Debug opcional: view para listar arquivos media
    from django.http import JsonResponse
    from django.views.decorators.http import require_http_methods
    import os
    
    @require_http_methods(["GET"])
    def debug_media_files(request):
        """View de debug para listar arquivos media gerados"""
        media_root = getattr(settings, 'MEDIA_ROOT', None)
        if not media_root:
            return JsonResponse({'error': 'MEDIA_ROOT not configured'}, status=500)
        
        reports_dir = os.path.join(media_root, 'reports')
        
        files = []
        if os.path.exists(reports_dir):
            for root, dirs, filenames in os.walk(reports_dir):
                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(file_path, media_root)
                    file_url = settings.MEDIA_URL + rel_path.replace('\\', '/')
                    
                    files.append({
                        'filename': filename,
                        'path': rel_path,
                        'url': request.build_absolute_uri(file_url),
                        'size': os.path.getsize(file_path)
                    })
        
        return JsonResponse({
            'debug': True,
            'media_root': media_root,
            'reports_dir': reports_dir,
            'reports_dir_exists': os.path.exists(reports_dir),
            'total_files': len(files),
            'files': files
        })
    
    urlpatterns += [
        path('debug/media-files/', debug_media_files, name='debug-media-files'),
    ]
