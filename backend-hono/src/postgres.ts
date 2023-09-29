import postgres from 'postgres';

const psql = postgres(process.env.POSTGRES_URL as string, {
    ssl: require
});

export default psql;
