import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, CombinedGraphQLErrors } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { GRAPHQL_ENDPOINT } from '../config/endpoints';

let cachedToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  cachedToken = token;
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

const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    const authError = error.errors?.find(
      (e) => e.extensions?.code === 'UNAUTHENTICATED',
    );
    if (authError) {
      cachedToken = null;
    }
  }
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
