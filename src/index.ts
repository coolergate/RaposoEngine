import cont from "./controllers";
import ents from "./entities";
import net from "./network";
import upd from "./lifecycle";

export const Entities = ents;
export const Network: typeof net = net; // what?
export const Lifecycle = upd;
export const Controllers = cont;