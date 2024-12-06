const CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? '' 
        : '/eonweb',
    ASSETS_URL: window.location.hostname === 'localhost'
        ? '/public'
        : '/eonweb/public'
}; 