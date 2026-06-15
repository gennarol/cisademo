const { app } = require('@azure/functions');
const { ensureTables } = require('../services/tableService');

app.http('initTables', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'init',
  handler: async (request, context) => {
    try {
      await ensureTables();
      return {
        status: 200,
        jsonBody: { message: 'Tables created successfully (Orders, OrderLines, CorrectionRequests)' },
      };
    } catch (error) {
      context.error('Error initializing tables:', error);
      return { status: 500, jsonBody: { error: 'Failed to initialize tables', details: error.message } };
    }
  }
});
