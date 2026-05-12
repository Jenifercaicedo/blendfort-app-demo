import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logoBlendfort from "../assets/blendfort-logo-largo.png";

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const sanitizeFilePart = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "general";

const formatNow = () => {
  const d = new Date();
  return d.toLocaleString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const loadImageMeta = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = reject;
    img.src = src;
  });

const PDF_GRAY_DARK = [31, 41, 55];
const PDF_GRAY = [107, 114, 128];
const PDF_GRAY_MEDIUM = [148, 163, 184];
const PDF_GRAY_LIGHT = [226, 232, 240];
const PDF_ROW_ALT = [248, 250, 252];
const PDF_HEAD_BG = [75, 85, 99];
const PDF_TOP_BAR = [55, 65, 81];
const PDF_FOOT_BG = [241, 245, 249];

const drawFooter = ({ doc, pageNumber, totalPages, marginX, pageHeight, footerText }) => {
  doc.setDrawColor(...PDF_GRAY_LIGHT);
  doc.line(marginX, pageHeight - 28, doc.internal.pageSize.getWidth() - marginX, pageHeight - 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_GRAY);
  doc.text(footerText, marginX, pageHeight - 12);
  doc.text(
    `Página ${pageNumber} de ${totalPages}`,
    doc.internal.pageSize.getWidth() - marginX,
    pageHeight - 12,
    { align: "right" }
  );
};

const buildFilename = ({ sections = [], pendingOnly = false }) => {
  if (sections.length === 1) {
    const only = sections[0];
    return `rol_pago_${sanitizeFilePart(only.project)}_${sanitizeFilePart(
      only.period
    )}.pdf`;
  }

  return pendingOnly
    ? "roles_pendientes_blendfort.pdf"
    : "roles_pago_blendfort.pdf";
};

const drawHeader = ({
  doc,
  logoMeta,
  title,
  projectText,
  periodText,
  emittedText,
  generatedByText,
  marginX,
  pageWidth,
}) => {
  doc.setFillColor(...PDF_TOP_BAR);
  doc.rect(0, 0, pageWidth, 16, "F");

  let currentY = 28;

  if (logoMeta?.dataUrl && logoMeta?.width && logoMeta?.height) {
    const maxLogoWidth = 200;
    const maxLogoHeight = 60;

    let logoWidth = maxLogoWidth;
    let logoHeight = (logoMeta.height / logoMeta.width) * logoWidth;

    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = (logoMeta.width / logoMeta.height) * logoHeight;
    }

    doc.addImage(logoMeta.dataUrl, "PNG", marginX, currentY, logoWidth, logoHeight);
    currentY += logoHeight + 18;
  } else {
    currentY += 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_GRAY_DARK);
  doc.setFontSize(18);
  doc.text(title, marginX, currentY);

  currentY += 18;

  doc.setFontSize(11);
  doc.setTextColor(...PDF_GRAY);

  doc.setFont("helvetica", "bold");
  doc.text(projectText, marginX, currentY);

  currentY += 14;

  doc.setFont("helvetica", "normal");
  doc.text(periodText, marginX, currentY);

  currentY += 14;
  doc.text(emittedText, marginX, currentY);

  currentY += 14;
  doc.text(generatedByText, marginX, currentY);

  return currentY + 14;
};

export const exportRolPagoPdf = async ({
  sections = [],
  generatedBy = "",
  pendingOnly = false,
}) => {
  if (!Array.isArray(sections) || !sections.length) {
    throw new Error("No hay secciones para exportar.");
  }

  const validSections = sections.filter(
    (section) => Array.isArray(section?.rows) && section.rows.length > 0
  );

  if (!validSections.length) {
    throw new Error("No hay datos para exportar.");
  }

  let logoMeta = null;
  try {
    logoMeta = await loadImageMeta(logoBlendfort);
  } catch (error) {
    console.warn("No se pudo cargar el logo para el PDF:", error);
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36;

  const totalGeneral = validSections.reduce(
    (acc, section) => acc + (Number(section?.total) || 0),
    0
  );

  validSections.forEach((section, index) => {
    if (index > 0) {
      doc.addPage();
    }

    const startY = drawHeader({
      doc,
      logoMeta,
      title: "ROL DE PAGO",
      projectText: `PROYECTO: ${norm(section?.project || "SIN PROYECTO")}`,
      periodText: `Periodo: ${String(section?.period || "SIN PERIODO").toUpperCase()}`,
      emittedText: `Emitido: ${formatNow()}`,
      generatedByText: `Generado por: ${norm(generatedBy || "ADMINISTRACION")}`,
      marginX,
      pageWidth,
    });

    autoTable(doc, {
      startY,
      margin: { left: marginX, right: marginX },
      head: [[
        "#",
        "Trabajador",
        "Cargo",
        "Días",
        "H. extra",
        "Bonos",
        "Descuentos",
        "Total a pagar",
      ]],
      body: section.rows.map((row, idx) => [
        String(idx + 1),
        String(row?.nombre || "").toUpperCase(),
        String(row?.cargo || "").toUpperCase(),
        String(Number(row?.dias) || 0),
        String(Number(row?.extras) || 0),
        `$ ${money(row?.bonos || 0)}`,
        `$ ${money(row?.descuentos || 0)}`,
        `$ ${money(row?.neto || 0)}`,
      ]),
      foot: [[
        "",
        "",
        "",
        "",
        "",
        "",
        validSections.length === 1 ? "TOTAL GENERAL" : "TOTAL PROYECTO",
        `$ ${money(section?.total || 0)}`,
      ]],
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 6,
        lineColor: PDF_GRAY_LIGHT,
        lineWidth: 0.6,
        textColor: PDF_GRAY_DARK,
        valign: "middle",
      },
      headStyles: {
        fillColor: PDF_HEAD_BG,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: PDF_ROW_ALT,
      },
      footStyles: {
        fillColor: PDF_FOOT_BG,
        textColor: PDF_GRAY_DARK,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 28 },
        1: { cellWidth: 170 },
        2: { cellWidth: 120 },
        3: { halign: "center", cellWidth: 50 },
        4: { halign: "center", cellWidth: 58 },
        5: { halign: "right", cellWidth: 82 },
        6: { halign: "right", cellWidth: 82 },
        7: { halign: "right", cellWidth: 92 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 7) {
          data.cell.styles.fontStyle = "bold";
        }

        if (data.section === "foot" && data.column.index === 6) {
          data.cell.styles.halign = "right";
        }

        if (data.section === "foot" && data.column.index === 7) {
          data.cell.styles.halign = "right";
        }
      },
    });

    if (index === validSections.length - 1) {
      let finalY = doc.lastAutoTable?.finalY || startY + 40;

      if (finalY > pageHeight - 120) {
        doc.addPage();

        finalY = drawHeader({
          doc,
          logoMeta,
          title: "ROL DE PAGO",
          projectText: "PROYECTO: RESUMEN FINAL",
          periodText: `Periodo: ${pendingOnly ? "ROLES PENDIENTES" : "ROL CONSOLIDADO"}`,
          emittedText: `Emitido: ${formatNow()}`,
          generatedByText: `Generado por: ${norm(generatedBy || "ADMINISTRACION")}`,
          marginX,
          pageWidth,
        });
      }

      autoTable(doc, {
        startY: finalY + 18,
        margin: { left: pageWidth - 260, right: marginX },
        head: [],
        body: [["TOTAL GENERAL", `$ ${money(totalGeneral)}`]],
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 10,
          cellPadding: 8,
          lineColor: PDF_GRAY_LIGHT,
          lineWidth: 0.8,
          textColor: PDF_GRAY_DARK,
          fontStyle: "bold",
        },
        columnStyles: {
          0: {
            halign: "right",
            cellWidth: 120,
          },
          1: {
            halign: "right",
            cellWidth: 90,
          },
        },
      });

      const signaturesY = (doc.lastAutoTable?.finalY || finalY + 50) + 34;

      if (signaturesY < pageHeight - 40) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...PDF_GRAY_DARK);
        doc.text("Firmas de control", marginX, signaturesY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...PDF_GRAY);

        doc.text("Elaborado por:", marginX, signaturesY + 32);
        doc.line(marginX + 82, signaturesY + 36, marginX + 240, signaturesY + 36);

        doc.text("Revisado por:", marginX + 280, signaturesY + 32);
        doc.line(marginX + 360, signaturesY + 36, marginX + 520, signaturesY + 36);

        doc.text("Recibido por:", marginX + 555, signaturesY + 32);
        doc.line(marginX + 632, signaturesY + 36, pageWidth - marginX, signaturesY + 36);
      }
    }
  });

  const totalPages = doc.getNumberOfPages();
  const footerText = pendingOnly
    ? "Blendfort · Roles pendientes"
    : "Blendfort · Rol de pago";

  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    drawFooter({
      doc,
      pageNumber: p,
      totalPages,
      marginX,
      pageHeight,
      footerText,
    });
  }

  doc.save(
    buildFilename({
      sections: validSections,
      pendingOnly,
    })
  );
};