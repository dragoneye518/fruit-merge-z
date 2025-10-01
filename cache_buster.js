// 缓存清除脚本
console.log('Cache buster loaded at:', new Date().toISOString());

// 强制清除模块缓存
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// 清除所有缓存
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
    }
  });
}

// 强制重新加载页面
setTimeout(() => {
  window.location.reload(true);
}, 1000);