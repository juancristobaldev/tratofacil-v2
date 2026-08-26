import {
  extractGraphQLErrorMessage,
  extractNetworkErrorMessage,
  extractApolloErrorMessage,
  formatApolloError,
} from './apollo';

describe('Apollo Error Extraction', () => {
  describe('extractGraphQLErrorMessage', () => {
    it('returns direct message when descriptive', () => {
      const err = { message: 'El usuario ya se encuentra registrado' };
      expect(extractGraphQLErrorMessage(err)).toBe('El usuario ya se encuentra registrado');
    });

    it('unpacks extensions.response.message string', () => {
      const err = {
        message: 'Bad Request Exception',
        extensions: {
          response: {
            message: 'URL de retorno no permitida.',
            statusCode: 400,
          },
        },
      };
      expect(extractGraphQLErrorMessage(err)).toBe('URL de retorno no permitida.');
    });

    it('unpacks extensions.response.message array', () => {
      const err = {
        message: 'Bad Request Exception',
        extensions: {
          response: {
            message: ['email debe ser un correo válido', 'password es requerido'],
            statusCode: 400,
          },
        },
      };
      expect(extractGraphQLErrorMessage(err)).toBe(
        'email debe ser un correo válido, password es requerido',
      );
    });

    it('unpacks extensions.originalError.message', () => {
      const err = {
        message: 'Internal server error',
        extensions: {
          originalError: {
            message: 'Error al iniciar registro de tarjeta en Flow: Cliente inválido',
            statusCode: 500,
          },
        },
      };
      expect(extractGraphQLErrorMessage(err)).toBe(
        'Error al iniciar registro de tarjeta en Flow: Cliente inválido',
      );
    });

    it('unpacks extensions.flowError.message', () => {
      const err = {
        message: 'Http Exception',
        extensions: {
          flowError: {
            message: 'El comercio no tiene autorización para esta operación',
            code: 105,
          },
        },
      };
      expect(extractGraphQLErrorMessage(err)).toBe(
        'El comercio no tiene autorización para esta operación',
      );
    });

    it('falls back to code if message is empty', () => {
      const err = {
        extensions: {
          code: 'UNAUTHORIZED',
        },
      };
      expect(extractGraphQLErrorMessage(err)).toBe('Error (UNAUTHORIZED)');
    });
  });

  describe('extractNetworkErrorMessage', () => {
    it('extracts nested errors from ServerError result.errors', () => {
      const netErr = {
        name: 'ServerError',
        statusCode: 400,
        result: {
          errors: [
            {
              message: 'Bad Request Exception',
              extensions: {
                response: {
                  message: 'URL de retorno no permitida: http://10.0.2.2:3000/api/register-card',
                },
              },
            },
          ],
        },
      };
      expect(extractNetworkErrorMessage(netErr)).toBe(
        'URL de retorno no permitida: http://10.0.2.2:3000/api/register-card',
      );
    });

    it('extracts message from ServerError result.message', () => {
      const netErr = {
        name: 'ServerError',
        statusCode: 500,
        result: {
          message: 'Error interno en el servicio de pagos',
        },
      };
      expect(extractNetworkErrorMessage(netErr)).toBe('Error interno en el servicio de pagos');
    });

    it('extracts message from bodyText JSON', () => {
      const netErr = {
        name: 'ServerParseError',
        statusCode: 502,
        bodyText: JSON.stringify({
          message: 'Servicio temporalmente fuera de línea',
        }),
      };
      expect(extractNetworkErrorMessage(netErr)).toBe('Servicio temporalmente fuera de línea');
    });

    it('formats network connection failed gracefully', () => {
      const netErr = {
        message: 'Network request failed',
      };
      expect(extractNetworkErrorMessage(netErr)).toBe(
        'No se pudo conectar con el servidor. Revisa tu conexión a internet.',
      );
    });

    it('formats status code if message is generic Response not successful', () => {
      const netErr = {
        statusCode: 503,
        message: 'Response not successful: Received status code 503',
      };
      expect(extractNetworkErrorMessage(netErr)).toBe('Error del servidor (HTTP 503)');
    });
  });

  describe('extractApolloErrorMessage & formatApolloError', () => {
    it('prioritizes GraphQL errors over generic network errors', () => {
      const graphQLErrors = [
        {
          message: 'Flow error: Saldo insuficiente en la cuenta',
        },
      ];
      const networkError = {
        statusCode: 400,
        message: 'Response not successful: Received status code 400',
      };
      expect(extractApolloErrorMessage(graphQLErrors, networkError)).toBe(
        'Flow error: Saldo insuficiente en la cuenta',
      );
    });

    it('never returns "unknown" when empty', () => {
      expect(extractApolloErrorMessage(null, null)).toBe('Error inesperado en la operación');
      expect(extractApolloErrorMessage([], undefined)).toBe('Error inesperado en la operación');
    });

    it('formats ApolloError object correctly', () => {
      const apolloErr = {
        graphQLErrors: [{ message: 'Cupón expirado o inválido' }],
        message: 'GraphQL error: Cupón expirado o inválido',
      };
      expect(formatApolloError(apolloErr)).toBe('Cupón expirado o inválido');
    });
  });
});
