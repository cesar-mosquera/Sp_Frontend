import re

def main():
    filepath = "/home/cesar/Documentos/Spy_Proyect/Sp_Frontend/src/pages/DashboardPage.tsx"
    with open(filepath, "r") as f:
        content = f.read()

    # 1. Imports
    imports_to_add = """import React, { Suspense, useMemo } from 'react';
import DeviceDetailPanel from '../components/DeviceDetailPanel';
import ExpandedLogModal from '../components/ExpandedLogModal';
import { LogMsg, BackendLog, DeviceInfo } from '../types/dashboard';
import { ICON_MAP, LOG_MESSAGES, formatTime } from '../utils/mockData';
"""
    # Replace the existing static imports for ChartsPanel and DeviceMap
    content = re.sub(r"import ChartsPanel from '../components/ChartsPanel';\n", "", content)
    content = re.sub(r"import DeviceMap from '../components/DeviceMap';\n", "", content)
    content = content.replace("import { useEffect, useRef, useState, useCallback } from 'react';", "import { useEffect, useRef, useState, useCallback } from 'react';\n" + imports_to_add)
    content = content.replace("import '../styles/dashboard.css';", """const ChartsPanel = React.lazy(() => import('../components/ChartsPanel'));
const DeviceMap = React.lazy(() => import('../components/DeviceMap'));
import '../styles/dashboard.css';""")

    # 2. Remove Interfaces and Mock Data (lines 10 to 94)
    # We can match from 'interface LogMsg' to 'export default function DashboardPage() {'
    content = re.sub(r"interface LogMsg.*?export default function DashboardPage", "export default function DashboardPage", content, flags=re.DOTALL)

    # 3. Canvas optimization
    canvas_ref_decl = "const [sseConnected, setSseConnected] = useState(false);"
    modal_ref_decl = """
  // Ref to pause canvas animation
  const isModalOpenRef = useRef(false);
  useEffect(() => {
    isModalOpenRef.current = expandedIdx !== null || detailDevice !== null;
  }, [expandedIdx, detailDevice]);
"""
    content = content.replace(canvas_ref_decl, canvas_ref_decl + modal_ref_decl)

    draw_func = """    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      }
      const maxDist = Math.min(W, H) * 0.15;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            ctx.strokeStyle = `rgba(179, 0, 255, ${(1 - dist / maxDist) * 0.25})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = `rgba(179, 0, 255, ${n.r * 0.15})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      const redNodes = nodes.slice(0, Math.floor(nodes.length * 0.08));
      for (const n of redNodes) {
        ctx.fillStyle = `rgba(255, 0, 51, ${n.r * 0.1})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };"""

    draw_func_opt = """    const draw = () => {
      if (!isModalOpenRef.current) {
        ctx.clearRect(0, 0, W, H);
        for (const n of nodes) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1;
          if (n.y < 0 || n.y > H) n.vy *= -1;
        }
        const maxDist = Math.min(W, H) * 0.15;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDist) {
              ctx.strokeStyle = `rgba(179, 0, 255, ${(1 - dist / maxDist) * 0.25})`;
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.stroke();
            }
          }
        }
        for (const n of nodes) {
          ctx.fillStyle = `rgba(179, 0, 255, ${n.r * 0.15})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
        }
        const redNodes = nodes.slice(0, Math.floor(nodes.length * 0.08));
        for (const n of redNodes) {
          ctx.fillStyle = `rgba(255, 0, 51, ${n.r * 0.1})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      animId = requestAnimationFrame(draw);
    };"""
    content = content.replace(draw_func, draw_func_opt)

    # 4. useMemo for filteredLogs
    filtered_logs_old = """  const filteredLogs = (source: BackendLog[] | LogMsg[]) => {
    let result = source;
    if (activeDeviceFilter !== 'all') {
      result = result.filter(e => 'device_id' in e && (e as BackendLog).device_id === activeDeviceFilter);
    }
    if (activeAppFilter !== 'all') {
      result = result.filter(e => {
        if (isReal) {
          return ((e as BackendLog).type || 'GENERAL').toLowerCase() === String(activeAppFilter).toLowerCase();
        }
        return ((e as LogMsg).app || '').toLowerCase() === String(activeAppFilter).toLowerCase();
      });
    }
    return result;
  };"""
    filtered_logs_new = """  const filteredLogsMemo = useMemo(() => {
    let result = sourceLogs;
    if (activeDeviceFilter !== 'all') {
      result = result.filter(e => 'device_id' in e && (e as BackendLog).device_id === activeDeviceFilter);
    }
    if (activeAppFilter !== 'all') {
      result = result.filter(e => {
        if (isReal) {
          return ((e as BackendLog).type || 'GENERAL').toLowerCase() === String(activeAppFilter).toLowerCase();
        }
        return ((e as LogMsg).app || '').toLowerCase() === String(activeAppFilter).toLowerCase();
      });
    }
    return result;
  }, [sourceLogs, activeDeviceFilter, activeAppFilter, isReal]);"""
    content = content.replace(filtered_logs_old, filtered_logs_new)
    
    # Replace filteredLogs(sourceLogs) with filteredLogsMemo
    content = content.replace("filteredLogs(sourceLogs)", "filteredLogsMemo")

    # 5. Extract DeviceDetailPanel (lines 911-1018)
    dev_panel_regex = r"\{/\* Device Detail Panel \*/\}.*?\{/\* Expanded message overlay \*/\}"
    content = re.sub(dev_panel_regex, """{detailDevice && detailDeviceInfo && (
        <DeviceDetailPanel
          detailDevice={detailDevice}
          detailDeviceInfo={detailDeviceInfo}
          allBackendLogs={allBackendLogs}
          detailTypeFilter={detailTypeFilter}
          setDetailDevice={setDetailDevice}
          setDetailTypeFilter={setDetailTypeFilter}
        />
      )}

      {/* Expanded message overlay */}""", content, flags=re.DOTALL)

    # 6. Extract ExpandedLogModal (lines 1019-1140)
    expanded_modal_regex = r"\{/\* Expanded message overlay \*/\}.*?<style>"
    content = re.sub(expanded_modal_regex, """{/* Expanded message overlay */}
      {expandedIdx !== null && !isReal && (
        <ExpandedLogModal
          expandedIdx={expandedIdx}
          setExpandedIdx={setExpandedIdx}
        />
      )}

      <style>""", content, flags=re.DOTALL)

    # 7. Remove <style> block
    style_regex = r"<style>.*?</style>"
    content = re.sub(style_regex, "", content, flags=re.DOTALL)

    # 8. React.Suspense wrapping for ChartsPanel and DeviceMap
    charts_old = "<ChartsPanel logs={allBackendLogs} />"
    charts_new = "<Suspense fallback={<div style={{padding: 20, color: '#fff'}}>Cargando Gráficos...</div>}><ChartsPanel logs={allBackendLogs} /></Suspense>"
    content = content.replace(charts_old, charts_new)
    
    map_old = "<DeviceMap logs={allBackendLogs} />"
    map_new = "<Suspense fallback={<div style={{padding: 20, color: '#fff'}}>Cargando Mapa...</div>}><DeviceMap logs={allBackendLogs} /></Suspense>"
    content = content.replace(map_old, map_new)

    with open(filepath, "w") as f:
        f.write(content)

if __name__ == "__main__":
    main()
