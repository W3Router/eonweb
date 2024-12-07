// 检查用户认证状态
async function checkAuthStatus() {
    try {
        // 从 localStorage 获取 token
        const token = localStorage.getItem('token');
        
        if (!token) {
            return { status: 'guest' };
        }

        // 验证 token
        const response = await fetch('/auth/api/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            return { status: 'authenticated' };
        } else {
            // token 无效，检查是否有注册记录
            const email = localStorage.getItem('userEmail');
            if (email) {
                return { status: 'registered' };
            }
            return { status: 'guest' };
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return { status: 'guest' };
    }
}

// 处理 Get Started 按钮点击
async function handleGetStarted() {
    const { status } = await checkAuthStatus();
    
    switch (status) {
        case 'authenticated':
            // 已登录用户跳转到 dashboard
            window.location.href = '/dashboard';
            break;
        case 'registered':
            // 已注册未登录用户跳转到登录页
            window.location.href = '/auth/login';
            break;
        default:
            // 新用户跳转到注册页
            window.location.href = '/auth/register';
    }
} 