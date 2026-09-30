import { chromium } from "playwright-core";

const base = process.env.CAMPEROPS_BASE_URL || "http://127.0.0.1:5174";
const routes = [
  "/dashboard",
  "/personnel",
  "/cargo",
  "/inventory",
  "/assets",
  "/vehicles",
  "/routes",
  "/incidents",
  "/operations",
  "/science",
  "/communications",
  "/readiness",
  "/environment",
  "/network",
  "/activity",
  "/settings",
  "/about-us",
];

const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "small-laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});

const context = await browser.newContext({
  viewport: viewports[0],
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push("console: " + message.text());
});
page.on("pageerror", (error) => errors.push("page: " + error.message));

await page.goto(base + "/login", {
  waitUntil: "domcontentloaded",
  timeout: 30000,
});
await page.getByRole("button", { name: /sign in to command console/i }).click();
await page.waitForURL("**/dashboard", { timeout: 15000 });

const report = {};

for (const viewport of viewports) {
  await page.setViewportSize(viewport);
  report[viewport.name] = {};

  for (const route of routes) {
    await page.goto(base + route, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.locator(".page-heading h1").waitFor({ timeout: 10000 });

    if (route === "/dashboard") {
      await page
        .getByRole("heading", { name: "Expedition map", exact: true })
        .waitFor({ timeout: 10000 });
      const mapBox = await page
        .locator(".dashboard-map-panel .polar-map")
        .boundingBox();
      if (!mapBox || Math.abs(mapBox.width - mapBox.height) > 2) {
        throw new Error(viewport.name + " dashboard map should remain square");
      }
    }

    const result = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const overflow =
        Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth,
        ) - viewportWidth;

      const controls = [
        ...document.querySelectorAll(
          "button,input,select,textarea,.sidebar .nav-link",
        ),
      ]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            width: rect.width,
            height: rect.height,
            visible:
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== "hidden" &&
              style.display !== "none",
          };
        })
        .filter((item) => item.visible);

      return {
        overflow,
        undersized: controls.filter(
          (item) => item.width < 24 || item.height < 24,
        ).length,
      };
    });

    if (result.overflow > 1) {
      throw new Error(
        viewport.name + " " + route + " overflows by " + result.overflow + "px",
      );
    }
    if (result.undersized > 0) {
      throw new Error(
        viewport.name +
          " " +
          route +
          " has " +
          result.undersized +
          " controls below 24px",
      );
    }

    report[viewport.name][route] = result;
  }
}

await page.setViewportSize(viewports[0]);
await page.goto(base + "/personnel", { waitUntil: "domcontentloaded" });
await page.locator(".table-wrap tbody tr").first().waitFor({ timeout: 10000 });
await page.getByRole("button", { name: "Open navigation" }).click();
await page.waitForTimeout(240);

const drawerBox = await page.locator(".sidebar.mobile-open").boundingBox();
if (!drawerBox || drawerBox.x < -1 || drawerBox.width < 250) {
  throw new Error("Mobile navigation drawer did not open correctly");
}

await page.getByRole("link", { name: "Cargo", exact: true }).click();
await page.waitForURL("**/cargo");
if (await page.locator(".sidebar.mobile-open").count()) {
  throw new Error("Mobile navigation drawer did not close after navigation");
}

await page.goto(base + "/personnel", { waitUntil: "domcontentloaded" });
await page.locator(".table-wrap tbody tr").first().waitFor({ timeout: 10000 });
const tableModes = await page
  .locator(".table-wrap thead")
  .evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).display),
  );
if (!tableModes.length || tableModes.some((mode) => mode !== "none")) {
  throw new Error("Mobile data tables did not switch to card mode");
}

await browser.close();

if (errors.length) {
  throw new Error(errors.join("\n"));
}

console.log(
  JSON.stringify({
    ok: true,
    viewports: viewports.map((item) => item.name),
    routes: routes.length,
    drawer: "passed",
    mobileTables: "card mode",
    report,
  }),
);
