# PyScript Demo

在浏览器里直接运行 Python,无需任何后端。编辑下面的代码,点「运行」即可看到输出。

<!-- 可执行代码块:样式见 stylesheets/extra.css 的 .py-cell 区块,自动适配明暗主题 -->
<div class="py-cell" markdown="0">
  <textarea id="py-code" class="py-code" spellcheck="false"># 这里可以编辑，然后点击运行
print("Hello, 这是一个可编辑、可运行的代码块！")
for i in range(3):
    print("第", i+1, "行")
</textarea>

  <div class="py-toolbar">
    <button id="py-run" class="py-btn py-btn--run" type="button">▶ 运行</button>
    <button id="py-clear" class="py-btn" type="button">清空输出</button>
  </div>

  <pre id="py-out" class="py-out" aria-live="polite"></pre>
</div>

<!-- 全部用 Python 绑定事件（避免 JS 等待 pyodide 的时序问题） -->
<script type="py">
import sys, io, traceback
from js import document
from pyodide.ffi import create_proxy

def run_code(event=None):
    code_area = document.getElementById("py-code")
    out_el    = document.getElementById("py-out")

    buf = io.StringIO()
    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = buf
    ns = {}                         # 如需跨次运行保留变量，可改为 ns = globals()
    try:
        exec(code_area.value, ns, ns)
    except Exception:
        traceback.print_exc()
    finally:
        sys.stdout, sys.stderr = old_out, old_err

    out_el.textContent = buf.getvalue()

def clear_out(event=None):
    document.getElementById("py-out").textContent = ""

document.getElementById("py-run").addEventListener("click", create_proxy(run_code))
document.getElementById("py-clear").addEventListener("click", create_proxy(clear_out))
</script>
