const CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? '' 
        : '/eonweb',
    API_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://你的API域名'
}; 