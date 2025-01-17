import cont from "./src/controllers";
import ents from "./src/entities";
import net from "./src/network";
import upd from "./src/lifecycle";

export const Entities = ents;
export const Network: typeof net = net; // what?
export const Lifecycle = upd;
export const Controllers = cont;