import { Hono } from "hono";

const healthRouter = new Hono();

healthRouter.get("/", async (c) => {
    try{
        return c.json({message: "Service is running smoothly", status: "ok" }, 200);
    }
    catch(error){
        return c.json({ status: "error", message: error.message }, 500);
    }
});

export default healthRouter;