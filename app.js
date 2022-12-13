const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "covid19India.db");

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(8000, () => {
      console.log("Server Running at http://localhost:8000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();
const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

// Get list of states
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT
      state_id as stateId,
      state_name as stateName,
      population as population
    FROM
      state
    ORDER BY
      state_id
   `;
  const statesArray = await database.all(getStatesQuery);
  response.send(statesArray);
});

//get a state
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    select * from state where state_id=${stateId};`;
  const state = await database.get(getStateQuery);
  response.send(convertDbObjectToResponseObject(state));
});

//post a disrict

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  //console.log(request.body);
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
    insert into district (district_name,state_id,cases,cured,active,deaths)
    values ('${districtName}',${stateId},${cases},${cured},${active},${deaths})`;
  await database.run(addDistrictQuery);

  response.send("District Successfully Added");
});

// get a district
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    select * from district where district_id=${districtId};`;
  const district = await database.get(getDistrictQuery);
  response.send(convertDbObjectToResponseObject(district));
});

//delete a district

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM district WHERE district_id=${districtId};`;
  await database.run(deleteDistrictQuery);
  response.send("District Removed");
});

// update a district
app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const updateDistrictQuery = `
   UPDATE district SET
   district_name="${districtName}",
   state_id=${stateId},
   cases=${cases},
   cured=${cured},
   active=${active},
   deaths=${deaths}
   WHERE
   district_id=${districtId};`;

  await database.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//statistics of total cases, cured, active, deaths of a specific state based on state ID
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
    SELECT
      SUM(cases) as totalCases,
      SUM(cured) as totalCured,
      SUM(active) as totalActive,
      SUM(deaths) as totalDeaths
    FROM
      district
   WHERE state_id`;
  const stats = await database.all(getStateStatsQuery);
  console.log(stats);
  response.send({
    totalCases: stats["totalCases"],
    totalCured: stats["totalCured"],
    totalActive: stats["totalActive"],
    totalDeaths: stats["totalDeaths"],
  });
});

//Returns an object containing the state name of a district based on the district ID
app.get("/districts/:districtId/details/", async (request, response) => {
  const getStateQuery = `
    select state_id from district where district_id=${districtId};`;

  const getDistrictIdQueryResponse = await database.get(getDistrictIdQuery);

  const getStateNameQuery = `
select state_name as stateName from state 
 where state_id = ${getDistrictIdQueryResponse.state_id};
`;
  //With this we will get state_name as stateName using the state_id
  const getStateNameResponse = await database.get(getStateNameQuery);
  response.send(getStateNameResponse);
});

module.exports = app;
