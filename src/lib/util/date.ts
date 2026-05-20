export function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}