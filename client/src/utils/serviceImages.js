const IMAGES = {
  electrician: '/images/services/electrician.jpg',
  plumber: '/images/services/plumber.jpg',
  'ac-repair': '/images/services/ac-repair.jpg',
  'home-cleaning': '/images/services/home-cleaning.jpg',
  'appliance-repair': '/images/services/appliance-repair.jpg',
  painter: '/images/services/painter.jpg',
  carpenter: '/images/services/carpenter.jpg',
  tutor: '/images/services/tutor.jpg',
  'pest-control': '/images/services/pest-control.jpg',
};

export function serviceImage(slug) {
  return IMAGES[slug] || '/images/services/electrician.jpg';
}

export function imageForProvider(provider) {
  const slug = provider?.services?.find((service) => service.category?.slug)?.category?.slug
    || provider?.categories?.find((category) => category.slug)?.slug;
  return serviceImage(slug);
}
