const { app } = require('@azure/functions');
const { getTableClient, TABLES } = require('../services/tableService');

app.http('approveOrder', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'orders/{orderId}/approve',
  handler: async (request, context) => {
    const orderId = request.params.orderId;

    try {
      const ordersClient = getTableClient(TABLES.ORDERS);

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

      // Only allow approval from specific statuses
      const allowedStatuses = ['da_controllare', 'richiesta_revisione'];
      if (!allowedStatuses.includes(entity.status)) {
        return {
          status: 400,
          jsonBody: { error: `Cannot approve order in status: ${entity.status}` }
        };
      }

      entity.status = 'approvato';
      await ordersClient.updateEntity(entity, 'Replace');

      return {
        status: 200,
        jsonBody: { id: orderId, status: 'approvato', message: 'Order approved' },
      };
    } catch (error) {
      context.error('Error approving order:', error);
      return { status: 500, jsonBody: { error: 'Failed to approve order' } };
    }
  }
});
