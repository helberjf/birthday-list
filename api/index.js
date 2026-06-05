let appPromise;

export default async function handler(req, res) {
  try {
    appPromise ??= import("../artifacts/api-server/dist/vercel.mjs").then(
      (mod) => mod.default,
    );

    const app = await appPromise;
    await new Promise((resolve, reject) => {
      res.on?.("finish", resolve);
      res.on?.("close", resolve);
      app(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error: "Serverless bootstrap failed",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
