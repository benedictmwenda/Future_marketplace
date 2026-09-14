document.addEventListener("DOMContentLoaded", () => {
    if (typeof sokohubBlogPosts === "undefined") return;

    const postByTitle = new Map(sokohubBlogPosts.map(post => [post.title, post]));

    document.querySelectorAll(".blog__sidebar__recent__item").forEach(item => {
        const title = item.querySelector("h6");
        const post = title && sokohubBlogPosts.find(candidate => candidate.title === title.textContent.trim());
        if (post) item.href = blogDetailsUrl(post.slug);
    });

    document.querySelectorAll(".blog__item").forEach(card => {
        const titleElement = card.querySelector("h5 a");
        const post = titleElement && postByTitle.get(titleElement.textContent.trim());
        if (!post) return;

        titleElement.href = blogDetailsUrl(post.slug);
        const image = card.querySelector(".blog__item__pic img");
        if (image) {
            image.src = post.image;
            image.alt = post.title;
        }
        card.querySelectorAll(".blog__btn").forEach(link => {
            link.href = blogDetailsUrl(post.slug);
        });
    });

    const query = new URLSearchParams(window.location.search);
    const selectedPost = sokohubBlogPosts.find(post => post.slug === query.get("post")) || sokohubBlogPosts[0];
    const detailText = document.querySelector(".blog__details__text");
    if (!detailText) return;

    document.title = `SokoHub | ${selectedPost.title}`;
    const heroTitle = document.querySelector(".blog__details__hero__text h2");
    const heroCategory = document.querySelector(".blog__details__hero__text .blog-tag-badge");
    const heroMeta = document.querySelector(".blog__details__hero__text ul");
    if (heroTitle) heroTitle.textContent = selectedPost.title;
    if (heroCategory) {
        heroCategory.textContent = selectedPost.category;
        heroCategory.className = `blog-tag-badge ${selectedPost.categoryClass}`;
    }
    if (heroMeta) heroMeta.innerHTML = `<li><i class="fa fa-user"></i> By ${selectedPost.author}</li><li><i class="fa fa-calendar-o"></i> ${selectedPost.date}</li><li><i class="fa fa-comment-o"></i> ${selectedPost.comments} Comments</li>`;

    detailText.innerHTML = `<img src="${selectedPost.image}" alt="${selectedPost.title}" style="width:100%; border-radius:8px; margin-bottom:25px;"><p>${selectedPost.paragraphs[0]}</p><h3>What to Know Before You Buy</h3>${selectedPost.paragraphs.slice(1).map(paragraph => `<p>${paragraph}</p>`).join("")}<blockquote><p>"Buy with clear information, communicate through SokoHub, and verify the details before you pay."</p><span>- SokoHub Trust Team</span></blockquote>`;

    const authorName = document.querySelector(".blog__details__author__text h6");
    const authorRole = document.querySelector(".blog__details__author__text span");
    const detailsWidget = document.querySelector(".blog__details__widget ul");
    if (authorName) authorName.textContent = selectedPost.author;
    if (authorRole) authorRole.textContent = `${selectedPost.category} Contributor @ SokoHub`;
    if (detailsWidget) detailsWidget.innerHTML = `<li><span>Categories:</span> ${selectedPost.category}</li><li><span>Tags:</span> ${selectedPost.tags}</li>`;

    const relatedPosts = sokohubBlogPosts.filter(post => post.slug !== selectedPost.slug && post.categoryClass === selectedPost.categoryClass).concat(sokohubBlogPosts.filter(post => post.slug !== selectedPost.slug && post.categoryClass !== selectedPost.categoryClass)).slice(0, 3);
    const relatedSection = document.createElement("section");
    relatedSection.className = "related-articles spad";
    relatedSection.innerHTML = `<div class="container"><div class="section-title"><h2>Related Articles</h2></div><div class="row">${relatedPosts.map(post => `<div class="col-lg-4 col-md-6"><article class="blog__item"><div class="blog__item__pic"><img src="${post.image}" alt="${post.title}" style="height:190px;width:100%;object-fit:cover;"></div><div class="blog__item__text"><span class="blog-tag-badge ${post.categoryClass}">${post.category}</span><ul><li><i class="fa fa-calendar-o"></i> ${post.date}</li><li><i class="fa fa-comment-o"></i> ${post.comments}</li></ul><h5><a href="${blogDetailsUrl(post.slug)}">${post.title}</a></h5><a href="${blogDetailsUrl(post.slug)}" class="blog__btn">READ MORE <span class="arrow_right"></span></a></div></article></div>`).join("")}</div></div>`;
    document.querySelector(".blog-details").after(relatedSection);
});
