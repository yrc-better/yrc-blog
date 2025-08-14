<!-- 可执行代码块：外观像普通代码块 -->
<div class="py-cell" style="margin:16px 0 28px;">
  <textarea id="py-code" class="py-code" style="
    width:100%;min-height:140px;resize:vertical;padding:12px 14px;
    font-family: ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace;
    line-height:1.55;white-space:pre;background:#f6f8fa;border:1px solid #e5e8eb;border-radius:6px;">
# 这里可以编辑，然后点击运行
print("Hello, 这是一个可编辑、可运行的代码块！")
for i in range(3):
    print("第", i+1, "行")
  </textarea>

  <div class="py-toolbar" style="margin:8px 0 10px;display:flex;gap:8px;">
    <button id="py-run"   style="padding:6px 10px;border:0;border-radius:6px;background:#2962ff;color:#fff;cursor:pointer;">运行</button>
    <button id="py-clear" style="padding:6px 10px;border:0;border-radius:6px;background:#eaeef2;color:#333;cursor:pointer;">清空输出</button>
  </div>

  <pre id="py-out" class="py-out" style="
    background:#0f172a;color:#e2e8f0;padding:10px 12px;border-radius:6px;min-height:1.6em;white-space:pre-wrap;"></pre>
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
