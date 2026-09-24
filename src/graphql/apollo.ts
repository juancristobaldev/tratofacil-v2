import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { GRAPHQL_ENDPOINT } from '../config/endpoints';

let cachedToken: string | null = null;
let onAuthError: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  cachedToken = token;
};

export const setAuthErrorHandler = (fn: (() => void) | null) => {
  onAuthError = fn;
};

const httpLink = new HttpLink({
  uri: GRAPHQL_ENDPOINT,
});

const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      authorization: cachedToken ? `Bearer ${cachedToken}` : '',
    },
  };
});

export function extractGraphQLErrorMessage(err: any): string {
  if (!err) return '';
  if (typeof err === 'string') return err.trim();

  // 1. Extensions response or originalError (NestJS class-validator or HttpException)
  const respMsg = err.extensions?.response?.message ?? err.extensions?.originalError?.message;
  if (Array.isArray(respMsg) && respMsg.length > 0) {
    return respMsg.map((m) => (typeof m === 'string' ? m.trim() : JSON.stringify(m))).join(', ');
  }
  if (typeof respMsg === 'string' && respMsg.trim()) {
    return respMsg.trim();
  }
  if (respMsg && typeof respMsg === 'object') {
    if (typeof respMsg.message === 'string' && respMsg.message.trim()) {
      return respMsg.message.trim();
    }
    if (typeof respMsg.error === 'string' && respMsg.error.trim()) {
      return respMsg.error.trim();
    }
  }

  // 2. Specific nested error details (Flow error, custom extensions)
  if (typeof err.extensions?.flowError?.message === 'string' && err.extensions.flowError.message.trim()) {
    return err.extensions.flowError.message.trim();
  }
  if (typeof err.extensions?.exception?.message === 'string' && err.extensions.exception.message.trim()) {
    return err.extensions.exception.message.trim();
  }
  if (typeof err.extensions?.message === 'string' && err.extensions.message.trim()) {
    return err.extensions.message.trim();
  }

  // 3. Main GraphQL error message (if not generic masked string)
  const mainMsg = typeof err.message === 'string' ? err.message.trim() : '';
  const genericMasks = ['Http Exception', 'Bad Request Exception', 'Internal server error', 'GraphQL error'];
  if (mainMsg && !genericMasks.includes(mainMsg)) {
    return mainMsg;
  }

  // 4. Fallback to originalError string or generic message if nothing else
  if (typeof err.extensions?.originalError === 'string' && err.extensions.originalError.trim()) {
    return err.extensions.originalError.trim();
  }
  if (mainMsg) {
    return mainMsg;
  }

  if (err.extensions?.code) {
    return `Error (${err.extensions.code})`;
  }

  return '';
}

export function extractNetworkErrorMessage(netErr: any): string {
  if (!netErr) return '';
  if (typeof netErr === 'string') return netErr.trim();

  // Apollo ServerError: result.errors or result.message
  if (netErr.result) {
    const res = netErr.result;
    if (Array.isArray(res.errors) && res.errors.length > 0) {
      const msgs = res.errors.map(extractGraphQLErrorMessage).filter(Boolean);
      if (msgs.length > 0) return msgs.join(' | ');
    }
    if (typeof res.message === 'string' && res.message.trim()) {
      return res.message.trim();
    }
    if (Array.isArray(res.message) && res.message.length > 0) {
      return res.message.join(', ');
    }
    if (typeof res.error === 'string' && res.error.trim()) {
      return res.error.trim();
    }
  }

  // Check bodyText if available
  if (typeof netErr.bodyText === 'string' && netErr.bodyText.trim()) {
    try {
      const parsed = JSON.parse(netErr.bodyText);
      if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
        const msgs = parsed.errors.map(extractGraphQLErrorMessage).filter(Boolean);
        if (msgs.length > 0) return msgs.join(' | ');
      }
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch {
      if (netErr.bodyText.length < 200 && !netErr.bodyText.startsWith('<')) {
        return netErr.bodyText.trim();
      }
    }
  }

  const rawMessage = typeof netErr.message === 'string' ? netErr.message.trim() : '';

  if (netErr.statusCode) {
    if (rawMessage && !rawMessage.includes('Response not successful')) {
      return `HTTP ${netErr.statusCode}: ${rawMessage}`;
    }
    return `Error del servidor (HTTP ${netErr.statusCode})`;
  }

  if (rawMessage) {
    if (rawMessage === 'Network request failed' || rawMessage.includes('Failed to fetch')) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión a internet.';
    }
    return rawMessage;
  }

  return 'Error de conexión con el servidor';
}

function serializeErrorForDebug(err: any): any {
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (Array.isArray(err)) return err.map(serializeErrorForDebug);
  if (err instanceof Error || (typeof err === 'object' && err !== null)) {
    const plain: Record<string, any> = {};
    const propNames = Object.getOwnPropertyNames(err);
    for (const key of propNames) {
      plain[key] = (err as any)[key];
    }
    if (err.result) plain.result = err.result;
    if (err.statusCode) plain.statusCode = err.statusCode;
    if (err.response) {
      plain.response = {
        status: err.response.status,
        statusText: err.response.statusText,
      };
    }
    return plain;
  }
  return err;
}

export function extractApolloErrorMessage(
  graphQLErrors?: readonly any[] | null,
  networkError?: any,
): string {
  if (graphQLErrors && graphQLErrors.length > 0) {
    const messages = graphQLErrors.map(extractGraphQLErrorMessage).filter(Boolean);
    if (messages.length > 0) {
      return messages.join(' | ');
    }
  }

  if (networkError) {
    const netMsg = extractNetworkErrorMessage(networkError);
    if (netMsg) return netMsg;
  }

  return 'Error inesperado en la operación';
}

export function formatApolloError(err: any): string {
  if (!err) return 'Error desconocido';
  if (typeof err === 'string') return err;
  return extractApolloErrorMessage(err.graphQLErrors, err.networkError) || err.message || 'Error inesperado';
}

export const errorLink = new ErrorLink(({ graphQLErrors, networkError, operation }: any) => {
  let isUnauthenticated = false;

  if (graphQLErrors) {
    const authError = graphQLErrors.find(
      (e: any) =>
        e.extensions?.code === 'UNAUTHENTICATED' ||
        e.extensions?.code === 'FORBIDDEN' ||
        e.message?.includes('Not Authenticated') ||
        e.message?.includes('Unauthorized'),
    );
    if (authError) {
      isUnauthenticated = true;
      cachedToken = null;
      onAuthError?.();
    }
  }

  if (networkError) {
    if (networkError.statusCode === 401 || networkError.message?.includes('401') || networkError.message?.includes('Unauthorized')) {
      isUnauthenticated = true;
      cachedToken = null;
      onAuthError?.();
    }
  }

  // Sanitize: do not clutter logs with expected auth errors on RegisterPushToken or when session expires
  if (operation.operationName === 'RegisterPushToken' && isUnauthenticated) {
    return;
  }

  if (isUnauthenticated) {
    if (__DEV__) {
      console.log(`[APOLLO:AUTH_EXPIRED] ${operation.operationName} -> Sesión expirada o no autenticada`);
    }
    return;
  }

  const errorMessage = extractApolloErrorMessage(graphQLErrors, networkError);
  console.error(
    '[APOLLO:ERROR]',
    operation.operationName,
    '|',
    errorMessage,
    '\n[FULL_GRAPHQL_ERRORS]:',
    JSON.stringify(serializeErrorForDebug(graphQLErrors), null, 2),
    '\n[NETWORK_ERROR]:',
    JSON.stringify(serializeErrorForDebug(networkError), null, 2),
  );
});

const cache = new InMemoryCache({
  typePolicies: {
    PayableItem: {
      keyFields: ['id', 'type'],
    },
    Category: {
      keyFields: ['id'],
    },
    Provider: {
      keyFields: ['id'],
      fields: {
        logoImage: { merge: (existing: any, incoming: any) => incoming ?? existing },
      },
    },
    Service: {
      keyFields: ['id'],
    },
    ServiceProvider: {
      keyFields: ['id'],
    },
    User: {
      keyFields: ['id'],
    },
    Order: {
      keyFields: ['id'],
    },
    OrderJob: {
      keyFields: ['id'],
    },
    OrderProduct: {
      keyFields: ['id'],
    },
    OrderRealTime: {
      keyFields: ['id'],
    },
    Job: {
      keyFields: ['id'],
    },
    Product: {
      keyFields: ['id'],
    },
    Wallet: {
      keyFields: ['id'],
    },
    WalletTransaction: {
      keyFields: ['id'],
    },
  },
});

if (__DEV__) {
  const origWrite = cache.write.bind(cache);
  const origModify = cache.modify.bind(cache);
  const origEvict = cache.evict.bind(cache);
  const origRead = cache.readFragment.bind(cache);

  function fmtLogo(data: any): string {
    if (!data) return 'data=null';
    if (data.logoImage?.id) {
      return `logoImage.id:${data.logoImage.id} cdnUrl:${String(data.logoImage.cdnUrl || '').slice(0, 50)}`;
    }
    if (data.logoImage === null) return 'logoImage:null';
    if (data.cdnUrl) return `cdnUrl:${String(data.cdnUrl).slice(0, 50)}`;
    return 'no_logo_fields';
  }

  function isImageEntity(id: string): boolean {
    if (!id) return false;
    return id.includes('Provider') || id.includes('Image');
  }

  cache.write = function (...args: any[]) {
    const result = (origWrite as any)(...args);
    const data = args[0];
    const id = data?.id || data?.dataId;
    if (isImageEntity(id)) {
      console.log('[CACHE:WRITE]', String(id).slice(0, 50), fmtLogo(data));
    }
    return result;
  } as any;

  cache.modify = function (...args: any[]) {
    const opts = args[0];
    if (isImageEntity(opts?.id)) {
      const logoFields = opts?.fields?.logoImage !== undefined ? 'Y' : 'N';
      const imgFields = opts?.fields?.logoUrl !== undefined ? 'Y' : 'N';
      console.log('[CACHE:MODIFY]', String(opts.id).slice(0, 50), '| logoImage present:', logoFields, '| logoUrl present:', imgFields);
      
      if (opts?.fields?.logoImage !== undefined) {
        const cached = cache.extract() as any;
        const prev = cached?.[opts.id]?.logoImage ?? 'MISSING';
        console.log('[CACHE:MODIFY:PREV]', String(opts.id).slice(0, 50), '| logoImage was:', JSON.stringify(prev)?.slice(0, 80));
      }
    }
    return (origModify as any)(...args);
  } as any;

  cache.evict = function (...args: any[]) {
    const opts = args[0];
    if (isImageEntity(opts?.id)) {
      console.log('[CACHE:EVICT]', String(opts.id).slice(0, 50));
    }
    return (origEvict as any)(...args);
  } as any;

  cache.readFragment = function (...args: any[]) {
    const result = (origRead as any)(...args);
    const opts = args[0];
    if (isImageEntity(opts?.id) && result) {
      console.log('[CACHE:READ]', String(opts.id).slice(0, 50), fmtLogo(result));
    }
    return result;
  } as any;
}

export const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
    },
  },
});
