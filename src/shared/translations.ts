export const translations = {
  en: {
    topBar: {
      inboxToday: 'Inbox Today',
      notificationHistory: 'Notification History',
      toggleLayout: 'Toggle Layout',
      refreshAll: 'Refresh All',
      settings: 'Settings',
      about: 'About CyberFeeds',
      minimize: 'Minimize',
      maximize: 'Maximize',
      close: 'Close'
    },
    sidebar: {
      allFeeds: 'All Feeds',
      favorites: 'Favorites',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
      newFolder: 'New Folder',
      addFeed: 'Add Feed',
      importOpml: 'Import OPML',
      exportOpml: 'Export OPML',
      feedsDoctor: 'Feeds Doctor',
      importFailed: 'Import failed',
      feedsAdded: 'feeds added',
      refreshFeed: 'Refresh Feed',
      editFeed: 'Edit Feed',
      pauseFeed: 'Pause Feed',
      resumeFeed: 'Resume Feed',
      deleteFeed: 'Delete Feed',
      refreshFolder: 'Refresh Folder',
      renameFolder: 'Rename Folder',
      pauseFolder: 'Pause Folder',
      resumeFolder: 'Resume Folder',
      deleteFolder: 'Delete Folder',
      deleteFeedTitle: 'Delete Feed',
      deleteFeedMsg: 'Are you sure you want to delete "{title}"? This action cannot be undone.',
      deleteFolderTitle: 'Delete Folder',
      deleteFolderMsg: 'Are you sure you want to delete folder "{name}"? Feeds inside will be unfiled.',
      cancel: 'Cancel',
      delete: 'Delete'
    },
    articleList: {
      favorites: 'Favorites',
      allFeeds: 'All Feeds',
      monitoring: 'MONITORING',
      paused: 'PAUSED',
      unreadOnly: 'Unread only',
      showAll: 'Show all',
      searchPlaceholder: 'Search articles...',
      noArticles: 'No articles',
      moreBelow: 'more below',
      yesterday: 'Yesterday',
      timeAgo: {
        justNow: 'just now',
        mAgo: 'm ago',
        hAgo: 'h ago',
        dAgo: 'd ago'
      },
      contextMenu: {
        markAsRead: 'Mark as read',
        markAsUnread: 'Mark as unread',
        copyLink: 'Copy link',
        openInBrowser: 'Open in browser',
        deleteArticle: 'Delete article',
        markAllAsRead: 'Mark all as read',
        deleteAllArticles: 'Delete all articles'
      },
      dialogs: {
        deleteAllTitle: 'Delete All Articles',
        deleteAllMsg: 'Are you sure you want to delete all articles in the current list? This action cannot be undone.',
        deleteAllBtn: 'Delete All'
      }
    },
    articleViewer: {
      selectToRead: 'Select an article to read',
      unstar: 'Unstar',
      star: 'Star',
      decreaseFont: 'Decrease Font Size',
      increaseFont: 'Increase Font Size',
      quickSummary: 'Quick Summary',
      summary: 'Summary',
      loadFull: 'Load Full Article',
      reload: 'Reload',
      fullArticle: 'Full Article',
      openInBrowser: 'Open in Browser',
      autoFetch: 'Auto-fetch full content',
      openDefaultBrowser: 'Open in default browser',
      dismiss: 'Dismiss'
    },
    settings: {
      title: 'Settings',
      cancel: 'Cancel',
      saveSettings: 'Save Settings',
      tabs: {
        general: 'General',
        appearance: 'Appearance',
        notifications: 'Notifications',
        keyboard: 'Keyboard',
        backupMaintenance: 'Maintenance'
      },
      general: {
        title: 'General',
        language: 'Language',
        pollingInterval: 'Polling Interval (minutes)',
        theme: 'Theme',
        themes: {
          dark: 'Dark (Default)',
          light: 'Light',
          dracula: 'Dracula',
          nord: 'Nord',
          hacker: 'Hacker',
          monokai: 'Monokai'
        },
        layout: 'Layout',
        layouts: {
          threePanel: 'Three Panel',
          twoPanel: 'Two Panel',
          onePanel: 'One Panel'
        },
        startWithWindows: 'Start with Windows',
        startMinimized: 'Start minimized to tray',
        requiresStartWithWindows: '(requires Start with Windows)',
        minimizeToTray: 'Minimize to tray on close',
        showThumbnails: 'Show featured image',
        linksOpenIn: 'External links open in',
        openOptions: {
          default: 'System default',
          custom: 'Custom browser'
        },
        pickBtn: 'Pick…',
        pickTooltip: 'Browse for browser executable'
      },
      notifications: {
        title: 'Notifications',
        enable: 'Enable notifications',
        showThumbnails: 'Show featured image',
        preloadImages: 'Show only when image is fully loaded',
        displayMonitor: 'Display / Monitor',
        singleDisplay: 'Single display detected ({width}×{height})',
        position: 'Position',
        positions: {
          'top-left': 'top left',
          'top-center': 'top center',
          'top-right': 'top right',
          'bottom-left': 'bottom left',
          'bottom-center': 'bottom center',
          'bottom-right': 'bottom right'
        },
        duration: 'Duration (ms)',
        maxStack: 'Max Stack',
        soundEnabled: 'Enable sound',
        alertSound: 'Alert Sound',
        browseBtn: 'Browse…',
        systemDefaultSound: "CyberFeeds' Default Sound",
        resetToDefault: 'Reset to default sound',
        previewBtn: 'Preview Notification',
        sendingBtn: 'Sending...'
      },
      fontSizes: {
        title: 'Column Font Sizes',
        sidebar: 'Sidebar: {size}px',
        articleList: 'Article List: {size}px',
        explanation: 'Column widths can be adjusted by dragging the dividers in the main layout.'
      },
      backup: {
        title: 'Global Backup & Restore',
        explanation: 'Export or import your entire configuration (feeds, folders, and settings). Note: Regular articles will be cleared, but your Favorites will be preserved.',
        exportBtn: 'Export Backup',
        importBtn: 'Import Backup',
        importSpinner: 'Importing...',
        dialogs: {
          importTitle: 'Import Backup',
          importMsg: 'This will OVERWRITE all your current feeds and settings. Continue?',
          importBtn: 'Import',
          exportSuccessTitle: 'Export Successful',
          exportSuccessMsg: 'Backup exported successfully!',
          importSuccessTitle: 'Import Successful',
          importSuccessMsg: 'Backup imported successfully! The app will reload to apply changes.',
          importFailTitle: 'Import Failed',
          importFailMsg: 'Import failed: {error}'
        }
      },
      maintenance: {
        title: 'Maintenance',
        explanation: 'Optimize your database by removing old data. Note: Articles marked with a star (Favorites) are never deleted.',
        deleteOlder: 'Delete read articles older than (days)',
        autoClean: 'Auto clean on startup',
        runCleanBtn: 'Run Clean Up Now'
      },
      keyboard: {
        title: 'Keyboard Shortcuts',
        explanation: 'Customize keyboard shortcuts for tray menu actions. Global shortcuts work even when the app is minimized.',
        actions: {
          showHide: 'Show / Hide',
          notifications: 'Notifications',
          settings: 'Settings',
          fetch: 'Fetch Now'
        },
        enabled: 'Enabled',
        global: 'Global Hotkey',
        accelerator: 'Shortcut',
        resetToDefaults: 'Reset to Defaults',
        save: 'Save',
        validation: {
          invalidFormat: 'Invalid format. Use format like Ctrl+Shift+A',
          conflict: 'This shortcut conflicts with another action'
        }
      }
    },
    inbox: {
      title: 'Inbox Today',
      articlesSuffix: 'articles',
      empty: 'No articles today'
    },
    about: {
      title: 'About CyberFeeds',
      version: 'Version {version}',
      desc: 'A high-performance, minimalist RSS reader designed for power users who value speed, privacy, and a clean reading experience.',
      engineCore: 'Engine Core',
      techStack: {
        electron: 'Native Desktop Shell',
        react: 'UI Library',
        vite: 'Build System',
        sqlite: 'Local Database',
        zustand: 'State Management',
        lucide: 'Iconography'
      },
      maintenance: 'Maintenance',
      autoUpdates: 'Auto updates',
      openFolder: 'Open Folder',
      checkUpdates: 'Check updates',
      statuses: {
        checking: 'Checking for updates…',
        latest: 'You’re on the latest version.',
        available: 'An update is available.',
        downloaded: 'Update ready to install.',
        error: 'Could not check for updates.',
        downloading: 'Downloading… {percent}%'
      },
      downloadBtn: 'Download',
      installBtn: 'Install'
    },
    doctor: {
      title: 'Feeds Doctor',
      scanSubtitle: 'Diagnostic Scan',
      lastRun: 'Last run: {time}',
      explanation: 'Scan all your feeds to detect connectivity issues, SSL errors, or invalid XML formats.',
      scanning: 'Scanning System...',
      startBtn: 'Start Diagnostic',
      resultsTitle: 'Results',
      issuesFound: 'Issues Found',
      issueFound: 'Issue Found',
      noIssues: 'No Issues Found',
      deleteFeedTitle: 'Delete Invalid Feed',
      deleteFeedMsg: 'Are you sure you want to delete this invalid feed? This action cannot be undone.',
      readyMsg: 'System ready for scan.',
      warningNote: 'Doctor scans are on-demand and do not affect background polling.'
    },
    addFeed: {
      title: 'Add Feed',
      urlLabel: 'Feed URL',
      previewBtn: 'Preview',
      folderLabel: 'Folder (optional)',
      noFolder: 'No folder',
      editNameLabel: 'Edit Feed Name',
      placeholderName: 'Enter custom feed name...',
      previewItemsLabel: 'Preview Items'
    },
    addFolder: {
      title: 'New Folder',
      nameLabel: 'Folder Name',
      placeholder: 'News, Tech, etc.',
      createBtn: 'Create Folder',
      failedMsg: 'Failed to add folder'
    },
    editFeed: {
      title: 'Edit Feed',
      titleLabel: 'Feed Title',
      urlLabel: 'Feed URL',
      folderLabel: 'Folder',
      saveBtn: 'Save Changes'
    },
    editFolder: {
      title: 'Rename Folder',
      nameLabel: 'Folder Name',
      placeholder: 'Folder Name',
      saveBtn: 'Save Changes',
      failedMsg: 'Failed to rename folder'
    },
    notifier: {
      seeHistory: 'See History',
      history: 'History',
      closeAll: 'Close All',
      close: 'Close',
      dismiss: 'Dismiss',
      markRead: 'Mark Read',
      snooze15: 'Snooze 15m',
      snooze1h: 'Snooze 1h',
      view: 'View',
      open: 'Open',
      more: 'more'
    },
    mainProcess: {
      tray: {
        showHide: 'Show / Hide',
        notifications: 'Notifications',
        settings: 'Configuration...',
        fetchNow: 'Fetch Now',
        quit: 'Exit'
      },
      webviewCtx: {
        openLink: 'Open Link',
        copyLinkAddress: 'Copy Link Address'
      }
    }
  },
  es: {
    topBar: {
      inboxToday: 'Bandeja de entrada de hoy',
      notificationHistory: 'Historial de notificaciones',
      toggleLayout: 'Cambiar diseño',
      refreshAll: 'Actualizar todo',
      settings: 'Configuración',
      about: 'Acerca de CyberFeeds',
      minimize: 'Minimizar',
      maximize: 'Maximizar',
      close: 'Cerrar'
    },
    sidebar: {
      allFeeds: 'Todos los feeds',
      favorites: 'Favoritos',
      expandAll: 'Expandir todo',
      collapseAll: 'Contraer todo',
      newFolder: 'Nueva carpeta',
      addFeed: 'Añadir feed',
      importOpml: 'Importar OPML',
      exportOpml: 'Exportar OPML',
      feedsDoctor: 'Doctor de feeds',
      importFailed: 'Error al importar',
      feedsAdded: 'feeds añadidos',
      refreshFeed: 'Actualizar feed',
      editFeed: 'Editar feed',
      pauseFeed: 'Pausar feed',
      resumeFeed: 'Reanudar feed',
      deleteFeed: 'Eliminar feed',
      refreshFolder: 'Actualizar carpeta',
      renameFolder: 'Renombrar carpeta',
      pauseFolder: 'Pausar carpeta',
      resumeFolder: 'Reanudar carpeta',
      deleteFolder: 'Eliminar carpeta',
      deleteFeedTitle: 'Eliminar feed',
      deleteFeedMsg: '¿Estás seguro de que deseas eliminar "{title}"? Esta acción no se puede deshacer.',
      deleteFolderTitle: 'Eliminar carpeta',
      deleteFolderMsg: '¿Estás seguro de que deseas eliminar la carpeta "{name}"? Los feeds que contiene quedarán sin clasificar.',
      cancel: 'Cancelar',
      delete: 'Eliminar'
    },
    articleList: {
      favorites: 'Favoritos',
      allFeeds: 'Todos los feeds',
      monitoring: 'MONITOREANDO',
      paused: 'PAUSADO',
      unreadOnly: 'Solo no leídos',
      showAll: 'Mostrar todo',
      searchPlaceholder: 'Buscar artículos...',
      noArticles: 'Sin artículos',
      moreBelow: 'más abajo',
      yesterday: 'Ayer',
      timeAgo: {
        justNow: 'hace un momento',
        mAgo: 'm atrás',
        hAgo: 'h atrás',
        dAgo: 'd atrás'
      },
      contextMenu: {
        markAsRead: 'Marcar como leído',
        markAsUnread: 'Marcar como no leído',
        copyLink: 'Copiar enlace',
        openInBrowser: 'Abrir en el navegador',
        deleteArticle: 'Eliminar artículo',
        markAllAsRead: 'Marcar todos como leídos',
        deleteAllArticles: 'Eliminar todos los artículos'
      },
      dialogs: {
        deleteAllTitle: 'Eliminar todos los artículos',
        deleteAllMsg: '¿Estás seguro de que deseas eliminar todos los artículos de la lista actual? Esta acción no se puede deshacer.',
        deleteAllBtn: 'Eliminar todos'
      }
    },
    articleViewer: {
      selectToRead: 'Selecciona un artículo para leer',
      unstar: 'Quitar de favoritos',
      star: 'Añadir a favoritos',
      decreaseFont: 'Disminuir tamaño de letra',
      increaseFont: 'Aumentar tamaño de letra',
      quickSummary: 'Resumen rápido',
      summary: 'Resumen',
      loadFull: 'Cargar artículo completo',
      reload: 'Recargar',
      fullArticle: 'Artículo completo',
      openInBrowser: 'Abrir en el navegador',
      autoFetch: 'Obtener contenido automáticamente',
      openDefaultBrowser: 'Abrir en el navegador predeterminado',
      dismiss: 'Cerrar'
    },
    settings: {
      title: 'Configuración',
      cancel: 'Cancelar',
      saveSettings: 'Guardar configuración',
      tabs: {
        general: 'General',
        appearance: 'Apariencia',
        notifications: 'Notificaciones',
        keyboard: 'Teclado',
        backupMaintenance: 'Mantenimiento'
      },
      general: {
        title: 'General',
        language: 'Idioma',
        pollingInterval: 'Intervalo de sondeo (minutos)',
        theme: 'Tema',
        themes: {
          dark: 'Oscuro (Predeterminado)',
          light: 'Claro',
          dracula: 'Dracula',
          nord: 'Nord',
          hacker: 'Hacker',
          monokai: 'Monokai'
        },
        layout: 'Diseño',
        layouts: {
          threePanel: 'Tres paneles',
          twoPanel: 'Dos paneles',
          onePanel: 'Un panel'
        },
        startWithWindows: 'Iniciar con Windows',
        startMinimized: 'Iniciar minimizado en la bandeja',
        requiresStartWithWindows: '(requiere Iniciar con Windows)',
        minimizeToTray: 'Minimizar en la bandeja al cerrar',
        showThumbnails: 'Mostrar imagen destacada',
        linksOpenIn: 'Los enlaces externos se abren en',
        openOptions: {
          default: 'Predeterminado del sistema',
          custom: 'Navegador personalizado'
        },
        pickBtn: 'Seleccionar…',
        pickTooltip: 'Buscar ejecutable del navegador'
      },
      notifications: {
        title: 'Notificaciones',
        enable: 'Habilitar notificaciones',
        showThumbnails: 'Mostrar imagen destacada',
        preloadImages: 'Mostrar solo cuando la imagen esté cargada',
        displayMonitor: 'Pantalla / Monitor',
        singleDisplay: 'Se detectó una sola pantalla ({width}×{height})',
        position: 'Posición',
        positions: {
          'top-left': 'superior izquierda',
          'top-center': 'superior centro',
          'top-right': 'superior derecha',
          'bottom-left': 'inferior izquierda',
          'bottom-center': 'inferior centro',
          'bottom-right': 'inferior derecha'
        },
        duration: 'Duración (ms)',
        maxStack: 'Pila máxima',
        soundEnabled: 'Habilitar sonido',
        alertSound: 'Sonido de alerta',
        browseBtn: 'Buscar…',
        systemDefaultSound: 'Sonido predeterminado de CyberFeeds',
        resetToDefault: 'Restablecer al sonido predeterminado',
        previewBtn: 'Vista previa de notificación',
        sendingBtn: 'Enviando...'
      },
      fontSizes: {
        title: 'Tamaños de letra de las columnas',
        sidebar: 'Sidebar: {size}px',
        articleList: 'Lista de artículos: {size}px',
        explanation: 'El ancho de las columnas se puede ajustar arrastrando los divisores en el diseño principal.'
      },
      backup: {
        title: 'Copia de seguridad y restauración global',
        explanation: 'Exporta o importa toda tu configuración (feeds, carpetas y ajustes). Nota: Los artículos normales se borrarán, pero se conservarán tus Favoritos.',
        exportBtn: 'Exportar copia',
        importBtn: 'Importar copia',
        importSpinner: 'Importando...',
        dialogs: {
          importTitle: 'Importar copia de seguridad',
          importMsg: 'Esto SOBREESCRIBIRÁ todos tus feeds y configuraciones actuales. ¿Continuar?',
          importBtn: 'Importar',
          exportSuccessTitle: 'Exportación exitosa',
          exportSuccessMsg: '¡Copia de seguridad exportada con éxito!',
          importSuccessTitle: 'Importación exitosa',
          importSuccessMsg: '¡Copia de seguridad importada con éxito! La aplicación se recargará para aplicar los cambios.',
          importFailTitle: 'Error al importar',
          importFailMsg: 'La importación falló: {error}'
        }
      },
      maintenance: {
        title: 'Mantenimiento',
        explanation: 'Optimiza tu base de datos eliminando datos antiguos. Nota: Los artículos marcados con estrella (Favoritos) nunca se eliminan.',
        deleteOlder: 'Eliminar artículos leídos anteriores a (días)',
        autoClean: 'Limpieza automática al iniciar',
        runCleanBtn: 'Ejecutar limpieza ahora'
      },
      keyboard: {
        title: 'Atajos de teclado',
        explanation: 'Personaliza los atajos de teclado para las acciones del menú de la bandeja. Los atajos globales funcionan incluso cuando la aplicación está minimizada.',
        actions: {
          showHide: 'Mostrar / Ocultar',
          notifications: 'Notificaciones',
          settings: 'Configuración',
          fetch: 'Obtener ahora'
        },
        enabled: 'Habilitado',
        global: 'Atajo global',
        accelerator: 'Atajo',
        resetToDefaults: 'Restablecer valores predeterminados',
        save: 'Guardar',
        validation: {
          invalidFormat: 'Formato inválido. Usa formato como Ctrl+Shift+A',
          conflict: 'Este atajo entra en conflicto con otra acción'
        }
      }
    },
    inbox: {
      title: 'Bandeja de entrada de hoy',
      articlesSuffix: 'artículos',
      empty: 'Sin artículos hoy'
    },
    about: {
      title: 'Acerca de CyberFeeds',
      version: 'Versión {version}',
      desc: 'Un lector de RSS minimalista y de alto rendimiento diseñado para usuarios avanzados que valoran la velocidad, la privacidad y una experiencia de lectura limpia.',
      engineCore: 'Núcleo del motor',
      techStack: {
        electron: 'Contenedor de escritorio nativo',
        react: 'Biblioteca de interfaz',
        vite: 'Sistema de construcción',
        sqlite: 'Base de datos local',
        zustand: 'Gestión de estado',
        lucide: 'Iconografía'
      },
      maintenance: 'Mantenimiento',
      autoUpdates: 'Actualizaciones automáticas',
      openFolder: 'Abrir carpeta',
      checkUpdates: 'Buscar actualizaciones',
      statuses: {
        checking: 'Buscando actualizaciones…',
        latest: 'Estás en la última versión.',
        available: 'Hay una actualización disponible.',
        downloaded: 'Actualización lista para instalar.',
        error: 'No se pudo buscar actualizaciones.',
        downloading: 'Descargando… {percent}%'
      },
      downloadBtn: 'Descargar',
      installBtn: 'Instalar'
    },
    doctor: {
      title: 'Doctor de feeds',
      scanSubtitle: 'Análisis de diagnóstico',
      lastRun: 'Última ejecución: {time}',
      explanation: 'Analiza todos tus feeds para detectar problemas de conectividad, errores de SSL o formatos XML no válidos.',
      scanning: 'Analizando el sistema...',
      startBtn: 'Iniciar diagnóstico',
      resultsTitle: 'Resultados',
      issuesFound: 'problemas encontrados',
      issueFound: 'problema encontrado',
      noIssues: 'No se encontraron problemas',
      deleteFeedTitle: 'Eliminar feed no válido',
      deleteFeedMsg: '¿Estás seguro de que deseas eliminar este feed no válido? Esta acción no se puede deshacer.',
      readyMsg: 'Sistema listo para el análisis.',
      warningNote: 'Los análisis del Doctor son bajo demanda y no afectan al sondeo en segundo plano.'
    },
    addFeed: {
      title: 'Añadir feed',
      urlLabel: 'URL del feed',
      previewBtn: 'Vista previa',
      folderLabel: 'Carpeta (opcional)',
      noFolder: 'Sin carpeta',
      editNameLabel: 'Editar nombre del feed',
      placeholderName: 'Introduce un nombre personalizado...',
      previewItemsLabel: 'Artículos de vista previa'
    },
    addFolder: {
      title: 'Nueva carpeta',
      nameLabel: 'Nombre de la carpeta',
      placeholder: 'Noticias, Tecnología, etc.',
      createBtn: 'Crear carpeta',
      failedMsg: 'Error al añadir carpeta'
    },
    editFeed: {
      title: 'Editar feed',
      titleLabel: 'Título del feed',
      urlLabel: 'URL del feed',
      folderLabel: 'Carpeta',
      saveBtn: 'Guardar cambios'
    },
    editFolder: {
      title: 'Renombrar carpeta',
      nameLabel: 'Nombre de la carpeta',
      placeholder: 'Nombre de la carpeta',
      saveBtn: 'Guardar cambios',
      failedMsg: 'Error al renombrar carpeta'
    },
    notifier: {
      seeHistory: 'Ver historial',
      history: 'Historial',
      closeAll: 'Cerrar todo',
      close: 'Cerrar',
      dismiss: 'Descartar',
      markRead: 'Marcar como leído',
      snooze15: 'Posponer 15m',
      snooze1h: 'Posponer 1h',
      view: 'Ver',
      open: 'Abrir',
      more: 'más'
    },
    mainProcess: {
      tray: {
        showHide: 'Mostrar / Ocultar',
        notifications: 'Notificaciones',
        settings: 'Configuración...',
        fetchNow: 'Buscar ahora',
        quit: 'Salir'
      },
      webviewCtx: {
        openLink: 'Abrir enlace',
        copyLinkAddress: 'Copiar dirección del enlace'
      }
    }
  }
}
