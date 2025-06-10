import express from "express";
import { Neo4jService } from "./Neo4jService";
import { OpenAIService } from "./OpenAIService";
import { fetchUsersFromApiDb } from "./fetchUsersFromApiDb";
import { fetchConnectionsFromApiDb } from "./fetchConnectionsFromApiDb";
import { log } from "console";

const app = express();
app.use(express.json());



if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
  throw new Error("NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set");
}

const openAIService = new OpenAIService();
const neo4jService = new Neo4jService(
  process.env.NEO4J_URI,
  process.env.NEO4J_USER,
  process.env.NEO4J_PASSWORD,
  openAIService
);


async function main3() {
  try {
          // Create vector indexes
      await neo4jService.createVectorIndex('user_index', 'User', 'embedding', 3072);
      await neo4jService.waitForIndexToBeOnline('user_index');
      console.log("Vector indexes 'user_index' is online and ready.");

    // Fetch users from external API
    const users = await fetchUsersFromApiDb();
    // Fetch connections from external API
    const connections = await fetchConnectionsFromApiDb();
    // Save to list (in-memory for now)

    //LOG USERS
    console.log("Fetched users:", users);
    //LOG CONNECTIONS   
    //console.log("Fetched connections:", connections);
      for (const user of users.reply) {
        const embedding = await openAIService.createEmbedding(user.username);
        await neo4jService.addNode('User', { ...user, embedding });
        //log user creation
        console.log(`User created: ${user.username} with ID: ${user.id}`);
      }

      for (const connection of connections.reply) {
        const userFrom = await neo4jService.findNodeByProperty('User', 'id', connection.user1_id);
        const userTo = await neo4jService.findNodeByProperty('User', 'id', connection.user2_id);
        if (userFrom && userTo) {
          await neo4jService.connectNodes(userFrom.id, userTo.id, 'CONNECTED_TO', { });
          //log connection creation
          console.log(`Connection created between User ID: ${userFrom.id} and User ID: ${userTo.id}`);
        }
      }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
  }
};
async function main2() {
     const query1 = `
MATCH (start:User {username: 'Rafał'}), (end:User {username: 'Barbara'})
MATCH path = shortestPath((start)-[:CONNECTED_TO*]-(end))
RETURN path;
    `;
    let nodesArray: any[] = [];
    const result1 = await neo4jService.executeQuery(query1);
//log result1
    console.log("Result of shortest path query:", result1);
      const record = result1.records[0];
        if (record) {
          const path = record.get('path');
           nodesArray = path.segments.map((seg: { start: any; }) => seg.start).concat(path.end);
        
        }
        //log nodesarray
        console.log("Nodes in the path:", nodesArray.map(node => node.properties.username || node.properties.id));
    //

}
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  //main3();
  main2();
});
