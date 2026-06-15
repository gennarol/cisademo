const { app } = require('@azure/functions');
const { getTableClient, TABLES, correctionToEntity } = require('../services/tableService');

app.http('requestCorrection', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'orders/{orderId}/request-correction',
  handler: async (request, context) => {
    const orderId = request.params.orderId;

    try {
      const body = await request.json();

      if (!body.message || !body.channel) {
        return { status: 400, jsonBody: { error: 'message and channel are required' } };
      }

      const ordersClient = getTableClient(TABLES.ORDERS);
      const correctionsClient = getTableClient(TABLES.CORRECTION_REQUESTS);

      // Fetch existing order
      let entity;
      try {
        entity = await ordersClient.getEntity('ORDER', orderId);
      } catch (err) {
        if (err.statusCode === 404) {
          return { status: 404, jsonBody: { error: 'Order not found' } };
        }
        throw err;
      }

      // Create correction request
      const correctionRequest = {
        id: Date.now(),
        message: body.message,
        channel: body.channel,
        date: new Date().toISOString(),
      };

      const corrEntity = correctionToEntity(orderId, correctionRequest);
      await correctionsClient.createEntity(corrEntity);

      // Update order status
      entity.status = 'richiesta_correzione';
      await ordersClient.updateEntity(entity, 'Replace');

      return {
        status: 201,
        jsonBody: {
          id: orderId,
          status: 'richiesta_correzione',
          correctionRequest,
          message: 'Correction requested',
        },
      };
    } catch (error) {
      context.error('Error requesting correction:', error);
      return { status: 500, jsonBody: { error: 'Failed to request correction' } };
    }
  }
});
