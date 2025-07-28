import React, { useEffect, useRef, useState } from "react";
import { Box, IconButton, Tooltip, Paper, Typography, Snackbar, Alert } from "@mui/material";
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ZoomOutMap as FitToScreenIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
  id: string;
  title?: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, id, title }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const showNotification = (message: string, severity: "success" | "error" | "info" = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    const renderDiagram = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        // Initialize mermaid with compatible configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
          },
        });

        // Clear any existing content and set loading state
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = '<div style="color: #666; text-align: center; padding: 40px;">🎨 Rendering diagram...</div>';

          // Create a unique ID for this diagram
          const diagramId = `mermaid-${id}-${Date.now()}`;

          // Render the diagram using mermaid v11 API
          const renderResult = await mermaid.render(diagramId, chart);
          const svg = (renderResult as any).svg || String(renderResult);

          // Insert the rendered SVG
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = svg;

            // Add zoom transform to the SVG
            const svgElement = mermaidRef.current.querySelector("svg");
            if (svgElement) {
              svgElement.style.transform = `scale(${zoom})`;
              svgElement.style.transformOrigin = "center";
              svgElement.style.transition = "transform 0.3s ease";
            }
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error rendering Mermaid diagram:", error);
        setHasError(true);
        setIsLoading(false);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #d32f2f;">
              <h4 style="margin: 0 0 10px 0;">⚠️ Diagram Rendering Error</h4>
              <p style="margin: 0 0 15px 0; color: #666;">Unable to render the diagram. Click below to view the source code.</p>
              <details style="margin-top: 10px;">
                <summary style="cursor: pointer; color: #1976d2; font-weight: 500;">📋 Show Diagram Source</summary>
                <pre style="text-align: left; background: #f5f5f5; padding: 15px; margin-top: 10px; overflow: auto; border-radius: 4px; font-size: 12px; line-height: 1.4;">${chart}</pre>
              </details>
            </div>
          `;
        }
      }
    };

    renderDiagram();
  }, [chart, id]);

  // Update zoom when zoom state changes
  useEffect(() => {
    if (mermaidRef.current && !isLoading && !hasError) {
      const svgElement = mermaidRef.current.querySelector("svg");
      if (svgElement) {
        svgElement.style.transform = `scale(${zoom})`;
      }
    }
  }, [zoom, isLoading, hasError]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.3));
  };

  const handleFitToScreen = () => {
    setZoom(1);
  };

  const handleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleDownloadSVG = () => {
    if (mermaidRef.current) {
      const svgElement = mermaidRef.current.querySelector("svg");
      if (svgElement) {
        // Create a copy of the SVG to ensure proper formatting
        const svgClone = svgElement.cloneNode(true) as SVGElement;

        // Add XML declaration and proper namespace
        const svgData = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
${new XMLSerializer().serializeToString(svgClone)}`;

        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${title || id}-diagram.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification(`Diagram downloaded as ${title || id}-diagram.svg`, "success");
      }
    }
  };

  const handleDownloadPNG = () => {
    if (mermaidRef.current) {
      const svgElement = mermaidRef.current.querySelector("svg");
      if (svgElement) {
        // Create a copy of the SVG to avoid CORS issues
        const svgClone = svgElement.cloneNode(true) as SVGElement;

        // Ensure the SVG has proper dimensions
        const bbox = svgElement.getBBox();
        svgClone.setAttribute("width", bbox.width.toString());
        svgClone.setAttribute("height", bbox.height.toString());
        svgClone.setAttribute("viewBox", `0 0 ${bbox.width} ${bbox.height}`);

        // Convert SVG to data URL
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;

        // Create canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        // Set high resolution for better quality
        const scale = 2;
        canvas.width = bbox.width * scale;
        canvas.height = bbox.height * scale;

        if (ctx) {
          ctx.scale(scale, scale);
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, bbox.width, bbox.height);
        }

        img.onload = () => {
          try {
            if (ctx) {
              ctx.drawImage(img, 0, 0, bbox.width, bbox.height);

              // Convert to blob and download
              canvas.toBlob((blob) => {
                if (blob) {
                  const pngUrl = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = pngUrl;
                  link.download = `${title || id}-diagram.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(pngUrl);
                  showNotification(`Diagram downloaded as ${title || id}-diagram.png`, "success");
                }
              }, "image/png");
            }
          } catch (error) {
            console.error("Error converting to PNG:", error);
            // Fallback: just download the SVG
            handleDownloadSVG();
            showNotification("PNG conversion failed, downloaded as SVG instead", "info");
          }
        };

        img.onerror = () => {
          console.error("Error loading SVG for PNG conversion");
          // Fallback: just download the SVG
          handleDownloadSVG();
          showNotification("PNG conversion failed, downloaded as SVG instead", "info");
        };

        // Set crossOrigin before setting src to avoid CORS issues
        img.crossOrigin = "anonymous";
        img.src = svgDataUrl;
      }
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(chart);
    showNotification("Mermaid code copied to clipboard", "info");
  };

  return (
    <Paper
      ref={containerRef}
      elevation={2}
      sx={{
        position: "relative",
        backgroundColor: "#ffffff",
        border: "1px solid #e0e0e0",
        borderRadius: "12px",
        overflow: "hidden",
        margin: "16px 0",
        minHeight: "200px",
      }}
    >
      {/* Header with Title and Controls */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderBottom: "1px solid #e0e0e0",
          backgroundColor: "#f8f9fa",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: "#1976d2" }}>
          {title || `Diagram ${id}`}
        </Typography>

        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Zoom In">
            <IconButton onClick={handleZoomIn} disabled={zoom >= 3} size="small">
              <ZoomInIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Zoom Out">
            <IconButton onClick={handleZoomOut} disabled={zoom <= 0.3} size="small">
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Fit to Screen">
            <IconButton onClick={handleFitToScreen} size="small">
              <FitToScreenIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Fullscreen">
            <IconButton onClick={handleFullscreen} size="small">
              <FullscreenIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Download as PNG">
            <IconButton onClick={handleDownloadPNG} disabled={isLoading || hasError} size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Download as SVG">
            <IconButton onClick={handleDownloadSVG} disabled={isLoading || hasError} size="small">
              <DownloadIcon sx={{ color: "#4caf50" }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Copy Mermaid Code">
            <IconButton onClick={handleCopyCode} size="small">
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Zoom Indicator */}
      {!isLoading && !hasError && (
        <Box
          sx={{
            position: "absolute",
            top: 70,
            right: 16,
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "white",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: "0.75rem",
            zIndex: 10,
          }}
        >
          {Math.round(zoom * 100)}%
        </Box>
      )}

      {/* Diagram Container */}
      <Box
        ref={mermaidRef}
        className={`mermaid-diagram mermaid-${id}`}
        sx={{
          width: "100%",
          overflow: "auto",
          textAlign: "center",
          padding: "20px",
          minHeight: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />

      {/* Loading/Error States */}
      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <div
            className="spinner"
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #f3f4f6",
              borderTop: "4px solid #3b82f6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <Typography variant="body2" color="text.secondary">
            Rendering diagram...
          </Typography>
        </Box>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default MermaidDiagram;
