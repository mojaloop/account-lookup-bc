import { start, startOracleAdminServer } from "./service";

start().then(() => {
    console.log("Started account lookup service");
    startOracleAdminServer();
});