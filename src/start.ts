import { MongoClient, ObjectId } from "mongodb"
import * as DataLoader from 'dataloader'
const express = require("express");
const { makeExecutableSchema } = require("graphql-tools");
const { graphiqlExpress } = require("apollo-server-express");;
const voyager = require("graphql-voyager/middleware").express;
const graphqlHTTP = require("express-graphql");
const fs = require("fs");
const app = express()
const start = async () => {
  const MONGO_URL = "mongodb://localhost:27017/blog"
  try {
    const db = await MongoClient.connect(MONGO_URL);
    const Posts = db.collection("posts");
    const Comments = db.collection("comments");
    const typeDefs = fs.readFileSync("./src/type.gql").toString();

    let postLoader = new DataLoader(async _id => {
      return Promise.all(_id.map(i => Posts.findOne(ObjectId(i))))
    })

    const resolvers = {
      Query: {
        post: async (root, { _id }) => {
          let d= await postLoader.load(_id)
          return d
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
          let r = await Posts.insert(args);
          return r.ops[0];
        },
        createComment: async (root, args) => {
          let r = await Comments.insert(args);
          return r.ops[0];
        }
      }
    };
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const endpointURL = "/api/gql";
    app.use(endpointURL + "/ide", graphiqlExpress({ endpointURL }));
    app.use(endpointURL + "/gui", voyager({ endpointUrl: endpointURL }));
    app.use(endpointURL, graphqlHTTP({ schema, graphiql: false })); // api
    app.listen(5000, () => {
      console.info(`http://localhost:${5000}${endpointURL}/ide`);
      console.info(`http://localhost:${5000}${endpointURL}/gui`);
    });
  } catch (e) {
    console.error(e);
  }
};

start();