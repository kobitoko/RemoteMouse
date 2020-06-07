import { Request, Response } from "express";
import robot from "robotjs";
/**
 * GET /
 * Home page.
 */
export const index = async (req: Request, res: Response) => {
    
    console.log("hi");
    // Get mouse position.
    const mouse = robot.getMousePos();
    console.log(mouse);
    // Get pixel color in hex format.
    //const hex = robot.getPixelColor(mouse.x, mouse.y);
    //console.log("#" + hex + " at x:" + mouse.x + " y:" + mouse.y);

    // Speed up the mouse.
    robot.setMouseDelay(2);

    const twoPI = Math.PI * 2.0;
    const screenSize = robot.getScreenSize();
    console.log(screenSize);
    // TODO: on event of mouse in client, call the equivalent events here with robot.
    /*
    robot.moveMouse(-screenSize.width, 0);
    robot.mouseToggle("down");
    robot.dragMouse(-screenSize.width*0.5, screenSize.height*0.5);
    robot.mouseToggle("up");
    robot.mouseClick();
    */


    res.render("client", {
        title: "client"
    });
};
