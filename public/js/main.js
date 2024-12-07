import { CONFIG } from './config.js';

document.addEventListener('DOMContentLoaded', () => \{\
    // \uc0\u21021 \u22987 \u21270 \u20027 \u39064 \u20999 \u25442 \
    initThemeToggle();\
    \
    // \uc0\u21021 \u22987 \u21270 \u23548 \u33322 \
    initNavigation();\
    \
    // \uc0\u21021 \u22987 \u21270 \u31890 \u23376 \u25928 \u26524 \
    initParticles();\
\});\
\
function initThemeToggle() \{\
    const themeToggle = document.querySelector('#checkbox');\
    if (themeToggle) \{\
        const currentTheme = localStorage.getItem('theme') || 'light';\
        document.body.dataset.theme = currentTheme;\
        themeToggle.checked = currentTheme === 'dark';\
\
        themeToggle.addEventListener('change', () => \{\
            const newTheme = themeToggle.checked ? 'dark' : 'light';\
            document.body.dataset.theme = newTheme;\
            localStorage.setItem('theme', newTheme);\
        \});\
    \}\
\}\
\
function initNavigation() \{\
    const nav = document.querySelector('.main-nav');\
    const navToggle = document.querySelector('.nav-toggle');\
    const navLinks = document.querySelectorAll('.nav-link');\
\
    // \uc0\u28378 \u21160 \u22788 \u29702 \
    let lastScroll = 0;\
    window.addEventListener('scroll', () => \{\
        const currentScroll = window.scrollY;\
        if (currentScroll > lastScroll && currentScroll > 100) \{\
            nav.classList.add('nav-hidden');\
        \} else \{\
            nav.classList.remove('nav-hidden');\
        \}\
        lastScroll = currentScroll;\
    \});\
\
    // \uc0\u31227 \u21160 \u31471 \u33756 \u21333 \
    if (navToggle) \{\
        navToggle.addEventListener('click', () => \{\
            document.body.classList.toggle('nav-open');\
        \});\
    \}\
\
    // \uc0\u24179 \u28369 \u28378 \u21160 \
    navLinks.forEach(link => \{\
        link.addEventListener('click', (e) => \{\
            e.preventDefault();\
            const target = document.querySelector(link.getAttribute('href'));\
            if (target) \{\
                target.scrollIntoView(\{\
                    behavior: 'smooth',\
                    block: 'start'\
                \});\
                document.body.classList.remove('nav-open');\
            \}\
        \});\
    \});\
\}\
\
function initParticles() \{\
    if (typeof particlesJS !== 'undefined' && document.getElementById('particles-js')) \{\
        particlesJS('particles-js', \{\
            particles: \{\
                number: \{\
                    value: 80,\
                    density: \{\
                        enable: true,\
                        value_area: 800\
                    \}\
                \},\
                color: \{\
                    value: '#ffffff'\
                \},\
                shape: \{\
                    type: 'circle'\
                \},\
                opacity: \{\
                    value: 0.5,\
                    random: false\
                \},\
                size: \{\
                    value: 3,\
                    random: true\
                \},\
                line_linked: \{\
                    enable: true,\
                    distance: 150,\
                    color: '#ffffff',\
                    opacity: 0.4,\
                    width: 1\
                \},\
                move: \{\
                    enable: true,\
                    speed: 6,\
                    direction: 'none',\
                    random: false,\
                    straight: false,\
                    out_mode: 'out',\
                    bounce: false\
                \}\
            \},\
            interactivity: \{\
                detect_on: 'canvas',\
                events: \{\
                    onhover: \{\
                        enable: true,\
                        mode: 'grab'\
                    \},\
                    onclick: \{\
                        enable: true,\
                        mode: 'push'\
                    \},\
                    resize: true\
                \}\
            \},\
            retina_detect: true\
        \});\
    \}\
\}\
\
function redirectToLogin() \{\
    window.location.href = 'public/auth/login.html';\
\}\
\
function redirectToDashboard() \{\
    window.location.href = 'public/dashboard/index.html';\
\}\
\
// 检查用户是否已注册
function isRegisteredUser() {
    return localStorage.getItem('userRegistered') === 'true';
}
\
// 处理 Get Started 按钮点击
function handleGetStarted() {
    if (isRegisteredUser()) {
        window.location.href = 'public/auth/login.html';
    } else {
        window.location.href = 'public/auth/register.html';
    }
}