export const translations = {
  en: {
    common: {
      close: 'Close',
      resizeSidebar: 'Drag to resize sidebar',
      resizeArticleList: 'Drag to resize article list'
    },
    topBar: {
      inboxToday: 'Inbox Today',
      notificationHistory: 'Notification History',
      toggleLayout: 'Toggle Layout',
      refreshAll: 'Refresh All',
      settings: 'Settings',
      about: 'About CyberFeeds',
      minimize: 'Minimize',
      maximize: 'Maximize',
      restore: 'Restore',
      close: 'Close',
      minimizeToTray: 'Minimize to tray'
    },
    sidebar: {
      allFeeds: 'All Articles',
      unreadArticles: 'Unread articles',
      favorites: 'Favorites',
      trash: 'Trash',
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
      deleteFolderMsg:
        'Are you sure you want to delete folder "{name}"? Feeds inside will be unfiled.',
      cancel: 'Cancel',
      delete: 'Delete',
      unreadCount: 'unread',
      readCountOne: 'read',
      readCountMany: 'read'
    },
    articleList: {
      favorites: 'Favorites',
      allFeeds: 'All Articles',
      unreadArticles: 'Unread articles',
      monitoring: 'MONITORING',
      paused: 'PAUSED',
      unreadOnly: 'Unread only',
      showAll: 'Show all',
      searchPlaceholder: 'Search articles...',
      noArticles: 'No articles',
      trash: 'Trash',
      emptyTrash: 'Empty trash',
      loadingFeed: 'Fetching the latest articles...',
      moreBelow: 'more below',
      backToTop: 'Back to top',
      yesterday: 'Yesterday',
      unread: 'Unread',
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
        copyImage: 'Copy image',
        openInBrowser: 'Open in browser',
        deleteArticle: 'Move article to trash',
        restoreArticle: 'Restore article',
        deletePermanently: 'Delete permanently',
        markAllAsRead: 'Mark all as read',
        deleteAllArticles: 'Move all articles to trash',
        emptyTrash: 'Empty trash',
        restoreAllTrash: 'Restore all articles',
        removeAllFavorites: 'Remove all from Favorites'
      },
      dialogs: {
        deleteAllTitle: 'Move All Articles to Trash',
        deleteAllMsg:
          'Are you sure you want to move all articles in the current list to the trash? You can restore them from Trash.',
        deleteAllBtn: 'Move to Trash',
        emptyTrashTitle: 'Empty Trash',
        emptyTrashMsg: 'Are you sure you want to permanently delete all articles in the trash? This action cannot be undone.',
        emptyTrashBtn: 'Empty Trash',
        deletePermanentlyTitle: 'Delete Article Permanently',
        deletePermanentlyMsg: 'Are you sure you want to permanently delete "{title}"? This action cannot be undone.',
        deletePermanentlyBtn: 'Delete Permanently',
        restoreAllTrashTitle: 'Restore All Trash Articles',
        restoreAllTrashMsg: 'Are you sure you want to restore all articles from the trash?',
        restoreAllTrashBtn: 'Restore All',
        removeAllFavoritesTitle: 'Remove All Favorites',
        removeAllFavoritesMsg: 'Are you sure you want to remove all articles from Favorites?',
        removeAllFavoritesBtn: 'Remove All'
      }
    },
    articleViewer: {
      selectToRead: 'Select an article to read',
      unstar: 'Remove from favorites',
      star: 'Add to favorites',
      decreaseFont: 'Decrease font size',
      increaseFont: 'Increase font size',
      quickSummary: 'Generate a short summary of this article',
      summary: 'Summary',
      loadFull: 'Fetch the complete article from the original site',
      reload: 'Reload',
      reloadTooltip: 'Reload full article content',
      fullArticle: 'Full Article',
      openInBrowser: 'Open in Browser',
      openInBrowserTooltip: 'Open this article in the browser',
      share: 'Share',
      shareTooltip: 'Copy article link',
      copied: 'Copied',
      linkCopied: 'Link copied',
      autoFetch: 'Fetch full content',
      autoFetchTooltip: 'Auto-fetch full content',
      openDefaultBrowser: 'Open in browser',
      dismiss: 'Dismiss',
      backToTop: 'Back to top',
      loadingFull: 'Loading full article...'
    },
    settings: {
      title: 'Settings',
      cancel: 'Cancel',
      saveSettings: 'Save Settings',
      close: 'Close',
      saved: 'Settings saved',
      saving: 'Saving…',
      saveError: 'Could not save settings',
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
        disableOnFullscreen: 'Disable during fullscreen apps (games, videos)',
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
        snoozeDuration: 'Snooze duration',
        soundEnabled: 'Enable sound',
        alertSound: 'Alert Sound',
        browseBtn: 'Browse…',
        systemDefaultSound: "CyberFeeds' Default Sound",
        resetToDefault: 'Reset to default sound',
        previewBtn: 'Preview Notification',
        sendingBtn: 'Sending...',
        previewTitle: 'CyberFeeds — Notification Preview',
        previewBody: 'Your notifications will appear like this.',
        openBehavior: 'On notification click',
        openInApp: 'Open in CyberFeeds',
        openInBrowser: 'Open in browser',
        openBehaviorHint: 'Browser uses the one configured under General.'
      },
      fontSizes: {
        title: 'Column Font Sizes',
        sidebar: 'Sidebar: {size}px',
        articleList: 'Article List: {size}px',
        explanation: 'Column widths can be adjusted by dragging the dividers in the main layout.'
      },
      backup: {
        title: 'Global Backup & Restore',
        explanation:
          'Export or import your entire configuration (feeds, folders, and settings). Note: Regular articles will be cleared, but your Favorites will be preserved.',
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
        explanation:
          'Optimize your database by removing old data. Note: Articles marked with a star (Favorites) are never deleted.',
        trashRetention: 'Trash items are automatically permanently deleted after 30 days.',
        deleteOlder: 'Delete read articles older than (days)',
        autoClean: 'Auto clean on startup',
        runCleanBtn: 'Run Clean Up Now'
      },
      keyboard: {
        title: 'Keyboard Shortcuts',
        explanation:
          'Customize keyboard shortcuts for tray menu actions. Global shortcuts work even when the app is minimized.',
        actions: {
          showHide: 'Show / Hide',
          notifications: 'Notifications',
          settings: 'Settings',
          fetch: 'Fetch Now'
        },
        enabled: 'Enabled',
        global: 'Global Hotkey',
        accelerator: 'Shortcut',
        empty: 'None',
        emptyHint: 'Click to set a shortcut',
        recording: 'Press keys…',
        clear: 'Clear shortcut',
        scopeGlobal: 'Global',
        scopeApp: 'App',
        scopeGlobalHint: 'Works even when CyberFeeds is minimized',
        scopeAppHint: 'Works only while CyberFeeds is focused',
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
      maintenance: 'Maintenance',
      autoUpdates: 'Auto updates',
      openFolder: 'Open data folder',
      checkUpdates: 'Check for updates',
      close: 'Close',
      githubTooltip: 'View project on GitHub',
      issuesTooltip: 'Report a bug or open an issue',
      releasesTooltip: 'View releases and changelogs',
      copyDiagnostics: 'Copy diagnostic info',
      diagnosticsCopied: 'Diagnostic info copied',
      statuses: {
        checking: 'Checking for updates…',
        latest: 'You’re on the latest version.',
        available: 'An update is available.',
        downloaded: 'Update ready to install.',
        error: 'Could not check for updates.',
        downloading: 'Downloading… {percent}%'
      },
      downloadBtn: 'Download update',
      installBtn: 'Install and restart'
    },
    doctor: {
      title: 'Feeds Doctor',
      scanSubtitle: 'Diagnostic Scan',
      lastRun: 'Last run: {time}',
      explanation:
        'Scan all your feeds to detect connectivity issues, SSL errors, or invalid XML formats.',
      scanning: 'Scanning System...',
      startBtn: 'Start Diagnostic',
      resultsTitle: 'Results',
      issuesFound: 'Issues Found',
      issueFound: 'Issue Found',
      noIssues: 'No Issues Found',
      deleteFeedTitle: 'Delete Invalid Feed',
      deleteFeedMsg:
        'Are you sure you want to delete this invalid feed? This action cannot be undone.',
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
      historyTooltip: 'Open notification history',
      closeAll: 'Close All',
      close: 'Close',
      closeTooltip: 'Dismiss this notification',
      closeAllTooltip: 'Dismiss all notifications',
      dismiss: 'Dismiss',
      dismissTooltip: 'Dismiss this notification',
      markRead: 'Mark Read',
      markReadTooltip: 'Mark as read and dismiss',
      snooze: 'Snooze {time}',
      snoozeTooltip: 'Pause notifications for {time}',
      view: 'View',
      viewTooltip: 'Open in CyberFeeds',
      open: 'Open',
      openTooltip: 'Open in browser',
      receivedAt: 'Received at {time}',
      more: 'more',
      moreTooltip: 'Show remaining notifications'
    },
    notificationHistory: {
      newCount: 'new',
      clearAll: 'Clear all',
      empty: 'No notifications',
      alreadySeen: 'Already Seen'
    },
    mainProcess: {
      tray: {
        showHide: 'Show / Hide',
        notifications: 'Notifications',
        settings: 'Configuration...',
        fetchNow: 'Fetch Now',
        pauseFeeds: 'Pause feeds',
        resumeFeeds: 'Resume feeds',
        quit: 'Exit'
      },
      webviewCtx: {
        openLink: 'Open Link',
        copyLinkAddress: 'Copy Link Address',
        copyImage: 'Copy Image',
        copy: 'Copy',
        searchGoogle: 'Search on Google',
        selectAll: 'Select All',
        undo: 'Undo',
        redo: 'Redo',
        cut: 'Cut',
        paste: 'Paste',
        delete: 'Delete'
      }
    }
  },
  es: {
    common: {
      close: 'Cerrar',
      resizeSidebar: 'Arrastra para redimensionar la barra lateral',
      resizeArticleList: 'Arrastra para redimensionar la lista de artículos'
    },
    topBar: {
      inboxToday: 'Bandeja de entrada de hoy',
      notificationHistory: 'Historial de notificaciones',
      toggleLayout: 'Cambiar diseño',
      refreshAll: 'Actualizar todo',
      settings: 'Configuración',
      about: 'Acerca de CyberFeeds',
      minimize: 'Minimizar',
      maximize: 'Maximizar',
      restore: 'Restaurar',
      close: 'Cerrar',
      minimizeToTray: 'Ocultar a la bandeja'
    },
    sidebar: {
      allFeeds: 'Todos los artículos',
      unreadArticles: 'Artículos sin leer',
      favorites: 'Favoritos',
      trash: 'Papelera',
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
      deleteFeedMsg:
        '¿Estás seguro de que deseas eliminar "{title}"? Esta acción no se puede deshacer.',
      deleteFolderTitle: 'Eliminar carpeta',
      deleteFolderMsg:
        '¿Estás seguro de que deseas eliminar la carpeta "{name}"? Los feeds que contiene quedarán sin clasificar.',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      unreadCount: 'sin leer',
      readCountOne: 'leído',
      readCountMany: 'leídos'
    },
    articleList: {
      favorites: 'Favoritos',
      allFeeds: 'Todos los artículos',
      unreadArticles: 'Artículos sin leer',
      monitoring: 'MONITOREANDO',
      paused: 'PAUSADO',
      unreadOnly: 'Solo no leídos',
      showAll: 'Mostrar todo',
      searchPlaceholder: 'Buscar artículos...',
      noArticles: 'Sin artículos',
      trash: 'Papelera',
      emptyTrash: 'Vaciar papelera',
      loadingFeed: 'Descargando los últimos artículos...',
      moreBelow: 'más abajo',
      backToTop: 'Volver al inicio',
      yesterday: 'Ayer',
      unread: 'Sin leer',
      timeAgo: {
        justNow: 'hace un momento',
        mAgo: 'Hace {num}m',
        hAgo: 'Hace {num}h',
        dAgo: 'Hace {num}d'
      },
      contextMenu: {
        markAsRead: 'Marcar como leído',
        markAsUnread: 'Marcar como no leído',
        copyLink: 'Copiar enlace',
        copyImage: 'Copiar imagen',
        openInBrowser: 'Abrir en el navegador',
        deleteArticle: 'Enviar artículo a la papelera',
        restoreArticle: 'Restaurar artículo',
        deletePermanently: 'Eliminar definitivamente',
        markAllAsRead: 'Marcar todos como leídos',
        deleteAllArticles: 'Enviar todos a la papelera',
        emptyTrash: 'Vaciar papelera',
        restoreAllTrash: 'Restaurar todos los artículos',
        removeAllFavorites: 'Quitar todos de Favoritos'
      },
      dialogs: {
        deleteAllTitle: 'Enviar todos los artículos a la papelera',
        deleteAllMsg:
          '¿Estás seguro de que deseas enviar todos los artículos de la lista actual a la papelera? Podrás restaurarlos desde la papelera.',
        deleteAllBtn: 'Enviar a la papelera',
        emptyTrashTitle: 'Vaciar papelera',
        emptyTrashMsg:
          '¿Estás seguro de que deseas eliminar definitivamente todos los artículos de la papelera? Esta acción no se puede deshacer.',
        emptyTrashBtn: 'Vaciar papelera',
        deletePermanentlyTitle: 'Eliminar artículo definitivamente',
        deletePermanentlyMsg:
          '¿Estás seguro de que deseas eliminar definitivamente "{title}"? Esta acción no se puede deshacer.',
        deletePermanentlyBtn: 'Eliminar definitivamente',
        restoreAllTrashTitle: 'Restaurar todos los artículos de la papelera',
        restoreAllTrashMsg: '¿Estás seguro de que deseas restaurar todos los artículos de la papelera?',
        restoreAllTrashBtn: 'Restaurar todos',
        removeAllFavoritesTitle: 'Quitar todos de Favoritos',
        removeAllFavoritesMsg: '¿Estás seguro de que deseas quitar todos los artículos de Favoritos?',
        removeAllFavoritesBtn: 'Quitar todos'
      }
    },
    articleViewer: {
      selectToRead: 'Selecciona un artículo para leer',
      unstar: 'Quitar de favoritos',
      star: 'Añadir a favoritos',
      decreaseFont: 'Disminuir tamaño de letra',
      increaseFont: 'Aumentar tamaño de letra',
      quickSummary: 'Generar un resumen breve de este artículo',
      summary: 'Resumen',
      loadFull: 'Obtener el artículo completo desde el sitio original',
      reload: 'Recargar',
      reloadTooltip: 'Recargar el contenido completo del artículo',
      fullArticle: 'Artículo completo',
      openInBrowser: 'Abrir en el navegador',
      openInBrowserTooltip: 'Abrir este artículo en el navegador',
      share: 'Compartir',
      shareTooltip: 'Copiar enlace del artículo',
      copied: 'Copiado',
      linkCopied: 'Enlace copiado',
      autoFetch: 'Obtener contenido completo',
      autoFetchTooltip: 'Obtener contenido completo automáticamente',
      openDefaultBrowser: 'Abrir en el navegador',
      dismiss: 'Cerrar',
      backToTop: 'Volver arriba',
      loadingFull: 'Cargando artículo completo...'
    },
    settings: {
      title: 'Configuración',
      cancel: 'Cancelar',
      saveSettings: 'Guardar configuración',
      close: 'Cerrar',
      saved: 'Configuración guardada',
      saving: 'Guardando…',
      saveError: 'No se pudo guardar',
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
        disableOnFullscreen: 'Desactivar en aplicaciones a pantalla completa (juegos, videos)',
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
        snoozeDuration: 'Duración de posponer',
        soundEnabled: 'Habilitar sonido',
        alertSound: 'Sonido de alerta',
        browseBtn: 'Buscar…',
        systemDefaultSound: 'Sonido predeterminado de CyberFeeds',
        resetToDefault: 'Restablecer al sonido predeterminado',
        previewBtn: 'Vista previa de notificación',
        sendingBtn: 'Enviando...',
        previewTitle: 'CyberFeeds — Vista previa de notificación',
        previewBody: 'Así se verán tus notificaciones.',
        openBehavior: 'Al hacer clic en la notificación',
        openInApp: 'Abrir en CyberFeeds',
        openInBrowser: 'Abrir en el navegador',
        openBehaviorHint: 'El navegador es el configurado en General.'
      },
      fontSizes: {
        title: 'Tamaños de letra de las columnas',
        sidebar: 'Sidebar: {size}px',
        articleList: 'Lista de artículos: {size}px',
        explanation:
          'El ancho de las columnas se puede ajustar arrastrando los divisores en el diseño principal.'
      },
      backup: {
        title: 'Copia de seguridad y restauración global',
        explanation:
          'Exporta o importa toda tu configuración (feeds, carpetas y ajustes). Nota: Los artículos normales se borrarán, pero se conservarán tus Favoritos.',
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
          importSuccessMsg:
            '¡Copia de seguridad importada con éxito! La aplicación se recargará para aplicar los cambios.',
          importFailTitle: 'Error al importar',
          importFailMsg: 'La importación falló: {error}'
        }
      },
      maintenance: {
        title: 'Mantenimiento',
        explanation:
          'Optimiza tu base de datos eliminando datos antiguos. Nota: Los artículos marcados con estrella (Favoritos) nunca se eliminan.',
        trashRetention: 'Los artículos de la papelera se eliminan definitivamente automáticamente después de 30 días.',
        deleteOlder: 'Eliminar artículos leídos anteriores a (días)',
        autoClean: 'Limpieza automática al iniciar',
        runCleanBtn: 'Ejecutar limpieza ahora'
      },
      keyboard: {
        title: 'Atajos de teclado',
        explanation:
          'Personaliza los atajos de teclado para las acciones del menú de la bandeja. Los atajos globales funcionan incluso cuando la aplicación está minimizada.',
        actions: {
          showHide: 'Mostrar / Ocultar',
          notifications: 'Notificaciones',
          settings: 'Configuración',
          fetch: 'Obtener ahora'
        },
        enabled: 'Habilitado',
        global: 'Atajo global',
        accelerator: 'Atajo',
        empty: 'Ninguno',
        emptyHint: 'Clic para asignar un atajo',
        recording: 'Presiona teclas…',
        clear: 'Quitar atajo',
        scopeGlobal: 'Global',
        scopeApp: 'App',
        scopeGlobalHint: 'Funciona incluso con CyberFeeds minimizado',
        scopeAppHint: 'Solo funciona con CyberFeeds en primer plano',
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
      maintenance: 'Mantenimiento',
      autoUpdates: 'Actualizaciones automáticas',
      openFolder: 'Abrir carpeta de datos',
      checkUpdates: 'Buscar actualizaciones',
      close: 'Cerrar',
      githubTooltip: 'Ver el proyecto en GitHub',
      issuesTooltip: 'Reportar un error o abrir un issue',
      releasesTooltip: 'Ver versiones y notas de cambios',
      copyDiagnostics: 'Copiar info de diagnóstico',
      diagnosticsCopied: 'Info de diagnóstico copiada',
      statuses: {
        checking: 'Buscando actualizaciones…',
        latest: 'Estás en la última versión.',
        available: 'Hay una actualización disponible.',
        downloaded: 'Actualización lista para instalar.',
        error: 'No se pudo buscar actualizaciones.',
        downloading: 'Descargando… {percent}%'
      },
      downloadBtn: 'Descargar actualización',
      installBtn: 'Instalar y reiniciar'
    },
    doctor: {
      title: 'Doctor de feeds',
      scanSubtitle: 'Análisis de diagnóstico',
      lastRun: 'Última ejecución: {time}',
      explanation:
        'Analiza todos tus feeds para detectar problemas de conectividad, errores de SSL o formatos XML no válidos.',
      scanning: 'Analizando el sistema...',
      startBtn: 'Iniciar diagnóstico',
      resultsTitle: 'Resultados',
      issuesFound: 'problemas encontrados',
      issueFound: 'problema encontrado',
      noIssues: 'No se encontraron problemas',
      deleteFeedTitle: 'Eliminar feed no válido',
      deleteFeedMsg:
        '¿Estás seguro de que deseas eliminar este feed no válido? Esta acción no se puede deshacer.',
      readyMsg: 'Sistema listo para el análisis.',
      warningNote:
        'Los análisis del Doctor son bajo demanda y no afectan al sondeo en segundo plano.'
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
      historyTooltip: 'Abrir historial de notificaciones',
      closeAll: 'Cerrar todo',
      close: 'Cerrar',
      closeTooltip: 'Descartar esta notificación',
      closeAllTooltip: 'Descartar todas las notificaciones',
      dismiss: 'Descartar',
      dismissTooltip: 'Descartar esta notificación',
      markRead: 'Marcar como leído',
      markReadTooltip: 'Marcar como leído y descartar',
      snooze: 'Posponer {time}',
      snoozeTooltip: 'Pausar notificaciones durante {time}',
      view: 'Ver',
      viewTooltip: 'Abrir en CyberFeeds',
      open: 'Abrir',
      openTooltip: 'Abrir en el navegador',
      receivedAt: 'Recibido a las {time}',
      more: 'más',
      moreTooltip: 'Ver notificaciones restantes'
    },
    notificationHistory: {
      newCount: 'nuevas',
      clearAll: 'Limpiar todo',
      empty: 'Sin notificaciones',
      alreadySeen: 'Ya vistas'
    },
    mainProcess: {
      tray: {
        showHide: 'Mostrar / Ocultar',
        notifications: 'Notificaciones',
        settings: 'Configuración...',
        fetchNow: 'Buscar ahora',
        pauseFeeds: 'Pausar feeds',
        resumeFeeds: 'Reactivar feeds',
        quit: 'Salir'
      },
      webviewCtx: {
        openLink: 'Abrir enlace',
        copyLinkAddress: 'Copiar dirección del enlace',
        copyImage: 'Copiar imagen',
        copy: 'Copiar',
        searchGoogle: 'Buscar en Google',
        selectAll: 'Seleccionar todo',
        undo: 'Deshacer',
        redo: 'Rehacer',
        cut: 'Cortar',
        paste: 'Pegar',
        delete: 'Eliminar'
      }
    }
  }
}
