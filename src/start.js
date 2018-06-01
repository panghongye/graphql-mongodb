const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");

const { makeExecutableSchema } = require("graphql-tools");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const voyager = require("graphql-voyager/middleware").express;
const graphqlHTTP = require("express-graphql");

const URL = "http://localhost";
const MONGO_URL = "mongodb://localhost:27017/blog";

const fs = require("fs");

const prepare = objectId => {
  objectId._id = objectId._id.toString();
  return objectId;
};

const start = async () => {
  try {
    const db = await MongoClient.connect(MONGO_URL);
    const Posts = db.collection("posts");
    const Comments = db.collection("comments");

    const typeDefs = fs.readFileSync("./src/type.gql").toString();
    const resolvers = {
      Query: {
        post: async (root, { _id }) => {
          return prepare(await Posts.findOne(ObjectId(_id)));
        },
        posts: async () => {
          return (await Posts.find({}).toArray()).map(prepare);
        },
        comment: async (root, { _id }) => {
          return prepare(await Comments.findOne(ObjectId(_id)));
        }
      },
      Post: {
        comments: async ({ _id }) => {
          return (await Comments.find({ postId: _id }).toArray()).map(prepare);
        }
      },
      Comment: {
        post: async ({ postId }) => {
          return prepare(await Posts.findOne(ObjectId(postId)));
        }
      },
      Mutation: {
        createPost: async (root, args, context, info) => {
          const res = await Posts.insert(args);
          return prepare(await Posts.findOne({ _id: res.insertedIds[1] }));
        },
        createComment: async (root, args) => {
          const res = await Comments.insert(args);
          return prepare(await Comments.findOne({ _id: res.insertedIds[1] }));
        }
      }
    };

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    });

    const app = express();

    app.use(cors());

    const endpointURL = "/api/gql";

    // GUI
    app.use(endpointURL + "/ide", graphiqlExpress({ endpointURL }));
    app.use(endpointURL + "/gui", voyager({ endpointUrl: endpointURL }));

    // API
    app.use(endpointURL, graphqlHTTP({ schema, graphiql: false }));

    app.listen(5000, () => {
      console.log(`http://localhost:${5000}${endpointURL}/ide`);
      console.log(`http://localhost:${5000}${endpointURL}/gui`);
    });
  } catch (e) {
    console.log(e);
  }
};

module.exports = start;
