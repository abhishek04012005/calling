// Professional Color Palette
export const colors = {
  primary: "#1e40af",
  primaryDark: "#1e3a8a",
  primaryLight: "#3b82f6",
  secondary: "#475569",
  secondaryLight: "#64748b",
  secondaryBg: "#f1f5f9",
  accent: "#0891b2",
  success: "#059669",
  danger: "#dc2626",
  warning: "#f59e0b",
  info: "#0891b2",
  background: "#ffffff",
  backgroundSecondary: "#f8fafc",
  backgroundTertiary: "#f1f5f9",
  textPrimary: "#1e293b",
  textSecondary: "#475569",
  textMuted: "#64748b",
  border: "#e2e8f0",
};

export const responsiveStyles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "1rem",
    "@media (max-width: 768px)": {
      padding: "0.5rem",
    },
  },
  flexCenter: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  flexBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridResponsive: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem",
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
      gap: "1rem",
    },
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "1.5rem",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e2e8f0",
    "@media (max-width: 768px)": {
      padding: "1rem",
    },
  },
  button: {
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    backgroundColor: colors.primary,
    color: "white",
    fontWeight: 500,
    transition: "all 0.3s ease",
    "@media (max-width: 768px)": {
      padding: "0.5rem 1rem",
      fontSize: "0.875rem",
    },
  },
  input: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    fontSize: "1rem",
    backgroundColor: "#ffffff",
    color: colors.textPrimary,
    transition: "all 0.3s ease",
    "@media (max-width: 768px)": {
      padding: "0.5rem",
      fontSize: "0.875rem",
    },
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    "@media (max-width: 768px)": {
      fontSize: "0.875rem",
    },
  },
  tableCell: {
    padding: "1rem",
    textAlign: "left" as const,
    borderBottom: "1px solid #e2e8f0",
    color: colors.textPrimary,
    "@media (max-width: 768px)": {
      padding: "0.5rem",
    },
  },
};
