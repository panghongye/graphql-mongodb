const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const { makeExecutableSchema } = require("graphql-tools");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const voyager = require("graphql-voyager/middleware").express;
const graphqlHTTP = require("express-graphql");
const fs = require("fs");

const URL = "http://localhost";
const MONGO_URL = "mongodb://localhost:27017/blog";
const app = express();

const start = async () => {
  try {
    const db = await MongoClient.connect(MONGO_URL);
    const Posts = db.collection("posts");
    const Comments = db.collection("comments");

    const typeDefs = fs.readFileSync("./src/type.gql").toString();
    const resolvers = {
      Query: {
        post: async (root, { _id }) => {
          return await Posts.findOne(ObjectId(_id));
        },
        posts: async () => {
          return await Posts.find({}).toArray();
        },
        comment: async (root, { _id }) => {
          return await Comments.findOne(ObjectId(_id));
        }
      },
      Post: {
        comments: async ({ _id }) => {
          return await Comments.find({ postId: _id }).toArray();
        }
      },
      Comment: {
        post: async ({ postId }) => {
          return await Posts.findOne(ObjectId(postId));
        }
      },
      Mutation: {
        createPost: async (root, args, context, info) => {
          const res = await Posts.insert(args);
          return await Posts.findOne({ _id: res.ops[0] });
        },
        createComment: async (root, args) => {
          const res = await Comments.insert(args);
          return await Comments.findOne({ _id: res.ops[0] });
        }
      }
    };

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    });

    const endpointURL = "/api/gql";

    // GUI
    app.use(endpointURL + "/ide", graphiqlExpress({ endpointURL }));
    app.use(endpointURL + "/gui", voyager({ endpointUrl: endpointURL }));

    // API
    app.use(endpointURL, graphqlHTTP({ schema, graphiql: false }));

    app.listen(5000, () => {
      console.info(`http://localhost:${5000}${endpointURL}/ide`);
      console.info(`http://localhost:${5000}${endpointURL}/gui`);
    });
  } catch (e) {
    console.error(e);
  }
};

start();

export default start;
