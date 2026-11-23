// Parses FRONTEND_URL (comma separated) into clean origins.
// Tolerates trailing slashes, paths and different casing, e.g. "https://App.vercel.app/home/".
// Returns "*" when unset so any origin is allowed.
export const getAllowedOrigins = () => {
    const raw = process.env.FRONTEND_URL;
    if (!raw || !raw.trim()) return "*";

    const origins = raw
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
        .map((o) => {
            try {
                return new URL(o).origin;
            } catch {
                return o.replace(/\/+$/, "");
            }
        });

    return origins.length ? origins : "*";
};
