package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.MessageDTO;
import com.esewa.javabackend.module.Message;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MessageMapper {
//    @Mapping(target = "conversationId", source = "conversation.id")
//    @Mapping(target = "senderId", source = "sender.id")
//    @Mapping(target = "senderName", source = "sender.username")
//    @Mapping(target = "isRead", expression = "java(message.getReadBy() != null && message.getReadBy().contains(currentUserId))")
//    MessageDTO toDto(Message message, Integer currentUserId);
}