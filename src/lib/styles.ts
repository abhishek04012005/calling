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
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "1.5rem",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    "@media (max-width: 768px)": {
      padding: "1rem",
    },
  },
  button: {
    padding: "0.75rem 1.5rem",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    "@media (max-width: 768px)": {
      padding: "0.5rem 1rem",
      fontSize: "0.875rem",
    },
  },
  input: {
    padding: "0.75rem",
    borderRadius: "4px",
    border: "1px solid #ddd",
    fontSize: "1rem",
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
    borderBottom: "1px solid #eee",
    "@media (max-width: 768px)": {
      padding: "0.5rem",
    },
  },
};
