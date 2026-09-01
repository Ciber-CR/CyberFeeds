;(function () {
  var bgs = {
    dark: '#0d1117',
    grayscale: '#18181b',
    light: '#f6f8fa',
    dracula: '#282a36',
    nord: '#2e3440',
    monokai: '#272822'
  }
  var theme = 'dark'
  try {
    theme = localStorage.getItem('cyberfeeds-theme') || 'dark'
  } catch (e) {
    /* ignore */
  }
  var bg = bgs[theme] || bgs.dark
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.backgroundColor = bg
  document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark'
})()
