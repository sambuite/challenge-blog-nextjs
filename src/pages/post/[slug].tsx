import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
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

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
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
      <Comments />
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

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      author: response.data.author,
      banner: response.data.banner,
      content: response.data.content,
      title: response.data.title,
      subtitle: response.data.subtitle,
    },
  };

  return {
    props: { post },
  };
};
