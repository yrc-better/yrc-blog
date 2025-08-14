(function () {
  const head = document.head;

  // 1) 样式：可保留在 mkdocs.yml 的 extra_css，也可由此注入（两者选其一）
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://cdn.jsdelivr.net/npm/@pyscript/core@2024.6.1/dist/core.css';
  head.appendChild(css);

  // 2) 以 ES Module 方式加载（关键！）
  function addModule(src) {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = src;
    head.appendChild(s);
  }

  // 主源
  addModule('https://cdn.jsdelivr.net/npm/@pyscript/core@2024.6.1/dist/core.js');
  addModule('https://cdn.jsdelivr.net/npm/@pyscript/core@2024.6.1/dist/python.js');

  // 备用镜像（若主源访问失败，可把上面两行改为下面任一镜像）
  // addModule('https://unpkg.com/@pyscript/core@2024.6.1/dist/core.js');
  // addModule('https://unpkg.com/@pyscript/core@2024.6.1/dist/python.js');
  // addModule('https://fastly.jsdelivr.net/npm/@pyscript/core@2024.6.1/dist/core.js');
  // addModule('https://fastly.jsdelivr.net/npm/@pyscript/core@2024.6.1/dist/python.js');

  // 小小自检：在控制台能看到这行就说明引导脚本已执行
  console.log('[bootstrap] PyScript bootstrap injected');
})();
