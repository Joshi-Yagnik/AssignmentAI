const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'AssignmentAI API',
    description: 'API Documentation for AssignmentAI platform',
    version: '1.0.0',
  },
  host: 'localhost:5000',
  schemes: ['http'],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: 'Enter your JWT token as: Bearer <token>'
    }
  },
  security: [ { bearerAuth: [] } ]
};

const outputFile = './src/swagger-output.json';
const routes = ['./src/index.js'];

// Generate swagger-output.json
swaggerAutogen(outputFile, routes, doc).then(() => {
  console.log('Swagger documentation generated successfully!');
});
