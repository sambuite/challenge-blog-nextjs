import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import Comments from '../../components/Comments';
import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

type AdjacentPost = {
  slug: string;
  title: string;
};

interface PostProps {
  post: Post;
  preview: boolean;
  adjacentPosts: AdjacentPost[];
}

export default function Post({ post, preview, adjacentPosts }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const totalWords = post.data.content.reduce((acc, content) => {
    acc += content.heading?.split(/\s+/).length || 0;

    const bodyWords = content.body.map(
      item => item.text.trim().split(/\s+/).length
    );

    bodyWords.map(word => (acc += word));

    return acc;
  }, 0);

  const wordsPerMinute = 200;

  const estimatedReadingTime = Math.ceil(totalWords / wordsPerMinute);

  return (
    <>
      <Head>
        <title>{post.data.title} | Spacetraveling</title>
      </Head>

      <Header />

      <div className={styles.banner}>
        <img src={post.data.banner.url} alt="Post banner" />
      </div>

      <main className={commonStyles.mainContainer}>
        <header className={styles.contentHeader}>
          <h1>{post.data.title}</h1>
          <div>
            <FiCalendar color="#BBBBBB" />
            <time>
              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </time>

            <FiUser color="#BBBBBB" />
            <span>{post.data.author}</span>

            <FiClock color="#BBBBBB" />
            <span>{estimatedReadingTime} min</span>
          </div>
          {post.first_publication_date !== post.last_publication_date && (
            <span className={styles.editedDate}>
              * editado em{' '}
              {format(
                new Date(post.last_publication_date),
                "dd MMM yyyy, 'às' HH:mm'h'",
                {
                  locale: ptBR,
                }
              )}
            </span>
          )}
        </header>

        <div className={styles.mainContent}>
          {post.data.content.map(content => (
            <article key={content.heading}>
              <h2>{content.heading}</h2>
              <div
                className={styles.content}
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </article>
          ))}
        </div>
      </main>
      <footer className={styles.footer}>
        <div className={styles.adjacentLinks}>
          {adjacentPosts?.[0] ? (
            <Link href={`/post/${adjacentPosts[0].slug}`}>
              <a>
                <span className={styles.postTitle}>
                  {adjacentPosts[0].title}
                </span>
                <span className={styles.linkText}>Post anterior</span>
              </a>
            </Link>
          ) : (
            <a style={{ display: 'none' }} />
          )}
          {adjacentPosts?.[1] && (
            <Link href={`/post/${adjacentPosts[1].slug}`}>
              <a>
                <span className={styles.postTitle}>
                  {adjacentPosts[1].title}
                </span>
                <span className={styles.linkText}>Próximo post</span>
              </a>
            </Link>
          )}
        </div>
        <Comments />
        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a className={commonStyles.previewButton}>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </footer>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'post'),
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      author: response.data.author,
      banner: response.data.banner,
      content: response.data.content,
      title: response.data.title,
      subtitle: response.data.subtitle,
    },
  };

  const nextResponse = await prismic.query(
    Prismic.Predicates.at('document.type', 'post'),
    {
      fetch: ['post.title'],
      pageSize: 1,
      after: response?.id,
      orderings: '[document.first_publication_date desc]',
    }
  );
  const prevResponse = await prismic.query(
    Prismic.Predicates.at('document.type', 'post'),
    {
      fetch: ['post.title'],
      pageSize: 1,
      after: response?.id,
      orderings: '[document.first_publication_date]',
    }
  );
  const nextPost = nextResponse?.results[0]
    ? {
        slug: nextResponse?.results[0].uid,
        title: nextResponse?.results[0].data.title,
      }
    : null;
  const prevPost = prevResponse?.results[0]
    ? {
        slug: prevResponse?.results[0].uid,
        title: prevResponse?.results[0].data.title,
      }
    : null;

  const adjacentPosts = [prevPost, nextPost];

  return {
    props: { post, preview, adjacentPosts },
  };
};
