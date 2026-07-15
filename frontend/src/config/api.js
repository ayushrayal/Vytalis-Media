export const API_URL =
  import.meta.env.MODE === "production"
    ? ""
    : "http://localhost:5000";
