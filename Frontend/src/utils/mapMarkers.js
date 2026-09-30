export function buildPolarMarkers({
  locations = [],
  telemetry = [],
  referenceStations = [],
  polarRegion = "south",
}) {
  return [
    ...locations.map((item) => {
      const type = String(item.type || "").toLowerCase();
      const category =
        type.includes("station") || type.includes("base")
          ? "base"
          : type.includes("camp")
            ? "camp"
            : type.includes("transport") || type.includes("air")
              ? "support"
              : "mission";

      return {
        ...item,
        kind: item.type || "Mission location",
        markerCategory: category,
        markerDetail: "Selected expedition",
      };
    }),
    ...telemetry.map((item) => ({
      ...item,
      name: item.entity_type + " #" + item.entity_id,
      kind: "Authorized GPS",
      markerCategory: "gps",
      markerDetail: "Latest expedition telemetry",
    })),
    ...referenceStations
      .filter(
        (item) =>
          Number.isFinite(Number(item.latitude)) &&
          Number.isFinite(Number(item.longitude)),
      )
      .map((item) => ({
        ...item,
        kind:
          polarRegion === "north"
            ? "Reference research station"
            : item.facility_type || "Reference facility",
        markerCategory: "research",
        markerDetail:
          polarRegion === "north"
            ? item.operating_country || item.location || "Arctic reference"
            : [item.country, item.seasonality].filter(Boolean).join(" · "),
      })),
  ];
}
