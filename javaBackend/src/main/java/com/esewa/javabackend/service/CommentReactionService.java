package com.esewa.javabackend.service;

import com.esewa.javabackend.dto.CommentDTO;
import com.esewa.javabackend.dto.ReactionDTO;
import com.esewa.javabackend.enums.ReactionType;
import com.esewa.javabackend.mapper.CommentMapper;
import com.esewa.javabackend.module.Comment;
import com.esewa.javabackend.module.Post;
import com.esewa.javabackend.module.Reaction;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.CommentRepository;
import com.esewa.javabackend.repository.JpaRepository.PostRepository;
import com.esewa.javabackend.repository.JpaRepository.ReactionRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.apache.kafka.common.errors.ResourceNotFoundException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentReactionService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final ReactionRepository reactionRepository;
    private final UserRepository userRepository;
    private final CommentMapper commentMapper;
    @Transactional
    public CommentDTO addComment(CommentDTO commentDTO) {
        Post post = postRepository.findById(commentDTO.getPostId())
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));

        User author = userRepository.findById(commentDTO.getAuthorId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

//        Comment comment = Comment.builder()
//                .post(post)
//                .author(author)
//                .body(commentDTO.getBody())
//                .build();
       Comment comment =  commentMapper.toEntity(commentDTO);

        comment.setPost(post);
        comment.setAuthor(author);

        if (commentDTO.getParentId() != null) {
            Comment parent = commentRepository.findById(commentDTO.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent comment not found"));
            comment.setParent(parent);
        }

        comment = commentRepository.save(comment);
        return commentMapper.toDTO(comment);
    }

    @Transactional
    public ReactionDTO addReaction(ReactionDTO reactionDTO) {

        Post post = postRepository.findById(reactionDTO.getPostId())
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));

        User user = userRepository.findById(reactionDTO.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check if the user already reacted to this post
        Reaction reaction = reactionRepository.findByPostIdAndUserId(post.getId(), user.getId())
                .orElse(Reaction.builder()
                        .post(post)
                        .user(user)
                        .build());

        // Set or update the type
        reaction.setType(ReactionType.valueOf(reactionDTO.getType()));
        reaction = reactionRepository.save(reaction);

        reactionDTO.setId(reaction.getId());
        return reactionDTO;
    }


    @Transactional
    public List<CommentDTO> getCommentsByPost(Integer postId) {
        List<Comment> rootComments = commentRepository.findByPostIdAndParentIsNull(postId, Sort.by(Sort.Direction.ASC, "createdAt"));
        return rootComments.stream()
                .map(this::mapWithReplies)
                .collect(Collectors.toList());
    }

    private CommentDTO mapWithReplies(Comment comment) {
        CommentDTO dto = commentMapper.toDTO(comment);
        Set<CommentDTO> replies = comment.getReplies().stream()
                .map(this::mapWithReplies)
                .collect(Collectors.toSet());
        dto.setReplies(replies);
        return dto;
    }
}
