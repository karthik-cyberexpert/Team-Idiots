const Footer = () => {
  return (
    <footer className="p-4 px-4 sm:px-6 lg:px-8">
      <div className="text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Team-Idiots. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;