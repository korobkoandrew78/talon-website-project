import Header from '@/components/site/Header';
import Hero from '@/components/site/Hero';
import Products from '@/components/site/Products';
import Accounts from '@/components/site/Accounts';
import Support from '@/components/site/Support';
import Footer from '@/components/site/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Products />
        <Accounts />
        <Support />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
